// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ShareToken.sol";
import "./MarketFactory.sol";

/**
 * @title OrderBook
 * @notice Central Limit Order Book (CLOB) for prediction market trading
 * @dev Handles limit orders, market orders, and order matching
 */
contract OrderBook is Ownable, ReentrancyGuard {

    // Structs
    struct Order {
        uint256 orderId;
        uint256 marketId;
        address maker;
        bool isBuyOrder;        // true = buy shares, false = sell shares
        bool isYesShare;        // true = YES shares, false = NO shares
        uint256 shares;         // Total shares in order
        uint256 pricePerShare;  // Price in USDC (6 decimals) per share
        uint256 filledShares;   // Shares already filled
        bool cancelled;
        uint256 timestamp;
    }

    // State variables
    ShareToken public shareToken;
    IERC20 public collateralToken;  // USDC
    MarketFactory public marketFactory;

    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;

    // Market orderbook: marketId => isYesShare => isBuyOrder => orderIds[]
    mapping(uint256 => mapping(bool => mapping(bool => uint256[]))) public orderbook;

    // User orders: user => orderIds[]
    mapping(address => uint256[]) public userOrders;

    // Protocol wallet for fees
    address public protocolWallet;

    // Fee: 2% taker fee
    uint256 public constant TAKER_FEE_PERCENT = 2;
    uint256 public constant FEE_DENOMINATOR = 100;

    // Events
    event OrderPlaced(
        uint256 indexed orderId,
        uint256 indexed marketId,
        address indexed maker,
        bool isBuyOrder,
        bool isYesShare,
        uint256 shares,
        uint256 pricePerShare
    );

    event OrderFilled(
        uint256 indexed orderId,
        address indexed taker,
        uint256 sharesFilled,
        uint256 totalCost
    );

    event OrderCancelled(uint256 indexed orderId);

    event FeesDistributed(
        uint256 indexed marketId,
        address author,
        address scout,
        address protocol,
        uint256 authorFee,
        uint256 scoutFee,
        uint256 protocolFee
    );

    event TradeExecuted(
        uint256 indexed marketId,
        address indexed trader,
        bool indexed isYesShare,
        bool isBuy,
        uint256 shares,
        uint256 pricePerShare,
        uint256 totalCost,
        uint256 timestamp
    );

    constructor(
        address _shareToken,
        address _collateralToken,
        address _marketFactory,
        address _protocolWallet
    ) Ownable(msg.sender) {
        shareToken = ShareToken(_shareToken);
        collateralToken = IERC20(_collateralToken);
        marketFactory = MarketFactory(_marketFactory);
        protocolWallet = _protocolWallet;
    }

    /**
     * @notice Place a limit order
     * @param marketId Market to trade in
     * @param isBuyOrder true to buy shares, false to sell
     * @param isYesShare true for YES shares, false for NO
     * @param shares Number of shares
     * @param pricePerShare Price in USDC per share (6 decimals)
     */
    function placeLimitOrder(
        uint256 marketId,
        bool isBuyOrder,
        bool isYesShare,
        uint256 shares,
        uint256 pricePerShare
    ) external nonReentrant returns (uint256 orderId) {
        require(shares > 0, "Shares must be > 0");
        require(pricePerShare > 0 && pricePerShare <= 1 * 10**6, "Invalid price");

        // Get market to verify it exists
        MarketFactory.Market memory market = marketFactory.getMarket(marketId);
        require(market.status == MarketFactory.ResolutionStatus.PENDING, "Market not active");

        uint256 tokenId = isYesShare ? market.yesTokenId : market.noTokenId;

        if (isBuyOrder) {
            // Buying shares: need to lock USDC
            uint256 totalCost = (shares * pricePerShare) / 10**18;
            require(
                collateralToken.transferFrom(msg.sender, address(this), totalCost),
                "USDC transfer failed"
            );
        } else {
            // Selling shares: need to lock shares
            require(
                shareToken.balanceOf(msg.sender, tokenId) >= shares,
                "Insufficient shares"
            );
            // Transfer shares to this contract
            shareToken.safeTransferFrom(msg.sender, address(this), tokenId, shares, "");
        }

        // Create order
        orderId = nextOrderId++;
        orders[orderId] = Order({
            orderId: orderId,
            marketId: marketId,
            maker: msg.sender,
            isBuyOrder: isBuyOrder,
            isYesShare: isYesShare,
            shares: shares,
            pricePerShare: pricePerShare,
            filledShares: 0,
            cancelled: false,
            timestamp: block.timestamp
        });

        // Add to orderbook
        orderbook[marketId][isYesShare][isBuyOrder].push(orderId);
        userOrders[msg.sender].push(orderId);

        emit OrderPlaced(orderId, marketId, msg.sender, isBuyOrder, isYesShare, shares, pricePerShare);

        // Try to match immediately
        _tryMatchOrder(orderId);
    }

    /**
     * @notice Execute a market order (fills at best available price)
     * @param marketId Market to trade in
     * @param isYesShare true for YES shares, false for NO
     * @param shares Number of shares to buy/sell
     * @param isBuyOrder true to buy, false to sell
     */
    function placeMarketOrder(
        uint256 marketId,
        bool isYesShare,
        uint256 shares,
        bool isBuyOrder
    ) external nonReentrant {
        require(shares > 0, "Shares must be > 0");

        MarketFactory.Market memory market = marketFactory.getMarket(marketId);
        require(market.status == MarketFactory.ResolutionStatus.PENDING, "Market not active");

        // Get opposite side orders (if buying, get sell orders)
        uint256[] storage oppositeOrders = orderbook[marketId][isYesShare][!isBuyOrder];

        uint256 remainingShares = shares;
        uint256 totalCost = 0;

        // Fill against existing orders
        for (uint256 i = 0; i < oppositeOrders.length && remainingShares > 0; i++) {
            Order storage order = orders[oppositeOrders[i]];

            if (order.cancelled || order.filledShares >= order.shares) {
                continue;
            }

            uint256 availableShares = order.shares - order.filledShares;
            uint256 sharesToFill = remainingShares > availableShares ? availableShares : remainingShares;

            // Calculate cost
            uint256 cost = (sharesToFill * order.pricePerShare) / 10**18;
            totalCost += cost;

            // Update order
            order.filledShares += sharesToFill;
            remainingShares -= sharesToFill;

            // Execute trade
            _executeTrade(order.orderId, msg.sender, sharesToFill, cost, isBuyOrder);
        }

        require(remainingShares == 0, "Insufficient liquidity");
    }

    /**
     * @notice Cancel an unfilled order
     * @param orderId Order to cancel
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.maker == msg.sender, "Not order maker");
        require(!order.cancelled, "Already cancelled");
        require(order.filledShares < order.shares, "Already filled");

        order.cancelled = true;

        // Refund locked assets
        uint256 unfilledShares = order.shares - order.filledShares;

        if (order.isBuyOrder) {
            // Refund locked USDC
            uint256 refund = (unfilledShares * order.pricePerShare) / 10**18;
            collateralToken.transfer(order.maker, refund);
        } else {
            // Refund locked shares
            MarketFactory.Market memory market = marketFactory.getMarket(order.marketId);
            uint256 tokenId = order.isYesShare ? market.yesTokenId : market.noTokenId;
            shareToken.safeTransferFrom(address(this), order.maker, tokenId, unfilledShares, "");
        }

        emit OrderCancelled(orderId);
    }

    /**
     * @notice Redeem winning shares after market resolution
     * @param marketId Market ID
     * @param isYesShare true for YES shares, false for NO
     * @param amount Number of shares to redeem
     */
    function redeemShares(
        uint256 marketId,
        bool isYesShare,
        uint256 amount
    ) external nonReentrant {
        MarketFactory.Market memory market = marketFactory.getMarket(marketId);
        require(market.status != MarketFactory.ResolutionStatus.PENDING, "Market not resolved");

        uint256 tokenId = isYesShare ? market.yesTokenId : market.noTokenId;
        require(shareToken.balanceOf(msg.sender, tokenId) >= amount, "Insufficient shares");

        uint256 payout;

        if (market.status == MarketFactory.ResolutionStatus.RESOLVED_INVALID) {
            // INVALID: both YES and NO redeem for $0.50
            payout = (amount * 5 * 10**5) / 10**18; // $0.50 per share
        } else if (market.status == MarketFactory.ResolutionStatus.RESOLVED_YES) {
            // YES wins
            payout = isYesShare ? (amount * 1 * 10**6) / 10**18 : 0;
        } else if (market.status == MarketFactory.ResolutionStatus.RESOLVED_NO) {
            // NO wins
            payout = isYesShare ? 0 : (amount * 1 * 10**6) / 10**18;
        }

        // Burn shares
        shareToken.burn(msg.sender, tokenId, amount);

        // Pay out USDC
        if (payout > 0) {
            collateralToken.transfer(msg.sender, payout);
        }
    }

    /**
     * @notice Try to match an order against existing orders
     * @param orderId Order to match
     */
    function _tryMatchOrder(uint256 orderId) internal {
        Order storage order = orders[orderId];

        // Get opposite side orders
        uint256[] storage oppositeOrders = orderbook[order.marketId][order.isYesShare][!order.isBuyOrder];

        for (uint256 i = 0; i < oppositeOrders.length; i++) {
            Order storage oppositeOrder = orders[oppositeOrders[i]];

            // Skip if cancelled or filled
            if (oppositeOrder.cancelled || oppositeOrder.filledShares >= oppositeOrder.shares) {
                continue;
            }

            // Check if prices match
            bool canMatch = order.isBuyOrder
                ? order.pricePerShare >= oppositeOrder.pricePerShare
                : order.pricePerShare <= oppositeOrder.pricePerShare;

            if (!canMatch) continue;

            // Calculate fill amount
            uint256 orderRemaining = order.shares - order.filledShares;
            uint256 oppositeRemaining = oppositeOrder.shares - oppositeOrder.filledShares;
            uint256 fillAmount = orderRemaining < oppositeRemaining ? orderRemaining : oppositeRemaining;

            // Execute at maker price (oppositeOrder price)
            uint256 fillCost = (fillAmount * oppositeOrder.pricePerShare) / 10**18;

            // Update both orders
            order.filledShares += fillAmount;
            oppositeOrder.filledShares += fillAmount;

            // Execute trade (order.maker is taker here)
            _executeTrade(oppositeOrder.orderId, order.maker, fillAmount, fillCost, order.isBuyOrder);

            // If order fully filled, stop
            if (order.filledShares >= order.shares) break;
        }
    }

    /**
     * @notice Execute a trade and distribute fees
     * @param makerOrderId Maker order ID
     * @param taker Taker address
     * @param shares Shares traded
     * @param cost Total cost in USDC
     * @param takerIsBuying true if taker is buying
     */
    function _executeTrade(
        uint256 makerOrderId,
        address taker,
        uint256 shares,
        uint256 cost,
        bool takerIsBuying
    ) internal {
        Order storage makerOrder = orders[makerOrderId];
        MarketFactory.Market memory market = marketFactory.getMarket(makerOrder.marketId);
        uint256 tokenId = makerOrder.isYesShare ? market.yesTokenId : market.noTokenId;

        // Calculate taker fee (2%)
        uint256 takerFee = (cost * TAKER_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 netCost = cost - takerFee;

        if (takerIsBuying) {
            // Taker buying shares from maker
            // Transfer shares from this contract (locked by maker) to taker
            shareToken.safeTransferFrom(address(this), taker, tokenId, shares, "");

            // Pay maker (minus their locked USDC is already in contract if they were buying)
            // Since maker was selling, they locked shares, now get USDC
            collateralToken.transfer(makerOrder.maker, netCost);
        } else {
            // Taker selling shares to maker
            // Transfer shares from taker to maker
            shareToken.safeTransferFrom(taker, makerOrder.maker, tokenId, shares, "");

            // Pay taker (minus fee)
            collateralToken.transfer(taker, netCost);
        }

        // Distribute fees
        _distributeFees(makerOrder.marketId, takerFee);

        emit OrderFilled(makerOrderId, taker, shares, cost);
        
        // Emit trade event for tracking purchase history
        emit TradeExecuted(
            makerOrder.marketId,
            taker,
            makerOrder.isYesShare,
            takerIsBuying,
            shares,
            makerOrder.pricePerShare,
            cost + takerFee, // Total cost including fee
            block.timestamp
        );
    }

    /**
     * @notice Distribute trading fees
     * @param marketId Market ID
     * @param feeAmount Total fee amount
     */
    function _distributeFees(uint256 marketId, uint256 feeAmount) internal {
        (
            address authorAddress,
            address scoutAddress,
            uint256 authorShare,
            uint256 scoutShare,
            uint256 protocolShare
        ) = marketFactory.getFeeRecipients(marketId);

        uint256 authorFee = (feeAmount * authorShare) / 100;
        uint256 scoutFee = (feeAmount * scoutShare) / 100;
        uint256 protocolFee = (feeAmount * protocolShare) / 100;

        if (authorAddress != address(0)) {
            collateralToken.transfer(authorAddress, authorFee);
        }
        collateralToken.transfer(scoutAddress, scoutFee);
        collateralToken.transfer(protocolWallet, protocolFee);

        emit FeesDistributed(marketId, authorAddress, scoutAddress, protocolWallet, authorFee, scoutFee, protocolFee);
    }

    /**
     * @notice Get all orders for a market
     * @param marketId Market ID
     * @param isYesShare true for YES, false for NO
     * @param isBuyOrder true for buy orders, false for sell orders
     */
    function getMarketOrders(
        uint256 marketId,
        bool isYesShare,
        bool isBuyOrder
    ) external view returns (uint256[] memory) {
        return orderbook[marketId][isYesShare][isBuyOrder];
    }

    /**
     * @notice Get user's orders
     * @param user User address
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }

    /**
     * @notice Support receiving ERC1155 tokens
     */
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }
}
