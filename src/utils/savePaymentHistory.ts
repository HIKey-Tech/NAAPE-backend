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
    return await PaymentHistory.create({
        user: userId,
        type,
        transactionId,
        amount,
        currency,
        status,
        metadata,
    });
};
