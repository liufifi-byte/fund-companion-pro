// Simplified PnL logic
function calculatePnL(transactions) {
    let totalPnL = 0;
    transactions.forEach(transaction => {
        const amount = transaction.amount;
        const price = transaction.price;
        totalPnL += (price * amount);
    });
    return totalPnL;
}