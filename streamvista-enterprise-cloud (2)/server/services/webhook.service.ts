import { getConnection } from '../db';
import { updateSubscription } from './subscription.service';
import { insertPayment, calculateBilling } from './billing.service';
import { provisionStorage } from './storage.service';
import { sendEmail } from './email.service';
import { getOrganizationAdmins } from './user.service';
import oracledb from 'oracledb';

export const processWebhook = async (event: any) => {
    const { event: eventType, payload } = event;
    const orgId = payload.subscription?.entity?.notes?.org_id;

    if (!orgId) return;
    const admins = await getOrganizationAdmins(orgId);

    switch (eventType) {
        case 'subscription.activated':
            const status = payload.subscription.entity.status === 'authenticated' ? 'TRIAL' : 'ACTIVE';
            await updateSubscription(orgId, status, payload.subscription.entity.plan_id, new Date(payload.subscription.entity.current_end * 1000));
            await provisionStorage(orgId, 50); 
            for (const admin of admins) {
                await sendEmail(admin, 'SUB_ACTIVATED', { plan: payload.subscription.entity.plan_id, storage: 50, renewalDate: new Date(payload.subscription.entity.current_end * 1000).toDateString() });
            }
            break;
        case 'subscription.charged':
            const billing = calculateBilling(payload.subscription.entity.plan_id);
            await insertPayment(orgId, billing.baseAmount, billing.gstAmount, billing.totalAmount, 'SUCCESS');
            for (const admin of admins) {
                await sendEmail(admin, 'SUB_RENEWED', { paid: billing.totalAmount, gst: billing.gstAmount, renewalDate: new Date(payload.subscription.entity.current_end * 1000).toDateString() });
            }
            break;
        case 'subscription.cancelled':
            await updateSubscription(orgId, 'CANCELED');
            for (const admin of admins) {
                await sendEmail(admin, 'SUB_CANCELLED', { cancelDate: new Date().toDateString(), endDate: new Date(payload.subscription.entity.current_end * 1000).toDateString() });
            }
            break;
        case 'payment.failed':
            await updateSubscription(orgId, 'PAST_DUE'); 
            for (const admin of admins) {
                await sendEmail(admin, 'PAYMENT_FAILED', { gracePeriodEnd: 'Pending' });
            }
            break;
    }
};
