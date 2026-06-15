import Razorpay from 'razorpay';

let razorpayClient: Razorpay | null = null;

export const getRazorpayClient = () => {
    if (!razorpayClient) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.warn('Razorpay credentials missing, billing features disabled');
            return null;
        }
        razorpayClient = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    }
    return razorpayClient;
};
