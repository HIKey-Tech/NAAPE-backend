import PaymentHistory from "../models/PaymentHistory";

export const savePaymentHistory = async (
    userId: string,
    type: string,
    transactionId: string,
    amount: number,
    currency: string,
    status: string,
    metadata: any = {}
) => {
    try {
        return await PaymentHistory.create({
            user: userId,
            type,
            transactionId,
            amount,
            currency,
            status,
            metadata,
        });
    } catch (err) {
        console.error("PaymentHistory error:", err);
        throw err;
    }
};
