const holdingCalc = (h, yesterdayClose, totalShares) => {
    // Other logic remains unchanged

    // Simplified PnL logic
    const todayPnlAmount = (h.currentNav - yesterdayClose) * totalShares;
    
    // Rest of the logic follows
};

export default holdingCalc;