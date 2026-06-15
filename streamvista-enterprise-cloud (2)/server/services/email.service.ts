import nodemailer from 'nodemailer';
import { getConnection } from '../db';
import { v4 as uuidv4 } from 'uuid';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
    if (!transporter) {
        if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('Email credentials missing, email service will not work.');
            return null;
        }
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT || 587),
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    return transporter;
};

export const logEmailEvent = async (eventType: string, email: string, status: string) => {
    const conn = await getConnection();
    try {
        await conn.execute(
            `INSERT INTO email_events (id, event_type, email, status) VALUES (:id, :type, :email, :status)`,
            { id: uuidv4(), type: eventType, email, status },
            { autoCommit: true }
        );
    } finally {
        await conn.close();
    }
};

export const sendEmail = async (to: string, template: 'VERIFY' | 'RESET' | 'WELCOME' | 'SUB_ACTIVATED' | 'SUB_RENEWED' | 'SUB_CANCELLED' | 'PAYMENT_FAILED' | 'QUOTA_WARNING', data?: any) => {
    let subject = '';
    let text = '';
    
    switch (template) {
        case 'VERIFY': subject = 'Verify Your Email'; text = 'Please verify your email.'; break;
        case 'RESET': subject = 'Password Reset'; text = 'Please reset your password.'; break;
        case 'WELCOME': subject = 'Welcome to Cloud X'; text = 'Welcome!'; break;
        case 'SUB_ACTIVATED': subject = 'Subscription Activated'; text = `Your subscription ${data.plan} is activated. Storage: ${data.storage}GB. Renews on ${data.renewalDate}.`; break;
        case 'SUB_RENEWED': subject = 'Subscription Renewed'; text = `Renewed. Paid $${data.paid}, GST $${data.gst}. Renews on ${data.renewalDate}.`; break;
        case 'SUB_CANCELLED': subject = 'Subscription Cancelled'; text = `Cancelled on ${data.cancelDate}. Ends on ${data.endDate}.`; break;
        case 'PAYMENT_FAILED': subject = 'Payment Failed'; text = `Payment failed. Please retry before ${data.gracePeriodEnd}.`; break;
        case 'QUOTA_WARNING': subject = 'Storage Quota Warning'; text = `Warning: ${data.percentage}% used. Used ${data.usedGB}GB / ${data.allocatedGB}GB.`; break;
    }
    
    const transporter = getTransporter();
    if (!transporter) {
        console.warn('Email service not configured, skipping email.');
        await logEmailEvent(template, to, 'SKIPPED');
        return;
    }
    
    try {
        await transporter.sendMail({ from: '"Cloud X" <noreply@cloudx.com>', to, subject, text });
        await logEmailEvent(template, to, 'SENT');
    } catch (e) {
        await logEmailEvent(template, to, 'FAILED');
        throw e;
    }
};
