// Updated Holding Calculator Logic

const calculateHolding = (shares, costBasis, dayChangePercent) => {
    const totalShares = shares.reduce((acc, share) => acc + share.amount, 0);
    const totalCost = shares.reduce((acc, share) => acc + share.amount * share.price, 0);
    const avgCost = totalShares > 0 ? totalCost / totalShares : 0;

    const currentValue = totalShares * avgCost; // Assuming currentValue is avgCost times totalShares
    const dayChange = dayChangePercent / 100;
    const yesterdayValue = currentValue / (1 + dayChange);
    const todayPnlAmount = currentValue - yesterdayValue;

    return {
        totalShares,
        totalCost,
        avgCost,
        todayPnlAmount
    };
};

// This function assumes `shares` is an array of objects where each object has an `amount` and `price`.

export { calculateHolding };