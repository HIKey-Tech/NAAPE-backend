import sgMail from "@sendgrid/mail";
import CommunicationHistory from "../models/CommunicationHistory";

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface BulkEmailOptions {
    recipients: string[];
    subject: string;
    text: string;
    html?: string;
    communicationId?: string;
}

interface EmailResult {
    email: string;
    status: 'sent' | 'failed';
    messageId?: string;
    error?: string;
}

interface BulkEmailResult {
    total: number;
    successful: number;
    failed: number;
    results: EmailResult[];
}

export const sendBulkEmail = async (options: BulkEmailOptions): Promise<BulkEmailResult> => {
    const { recipients, subject, text, html, communicationId } = options;
    
    console.log(`[BULK EMAIL] Starting bulk email send to ${recipients.length} recipients`);
    
    const results: EmailResult[] = [];
    let successful = 0;
    let failed = 0;

    // Update communication history to 'sending' status
    if (communicationId) {
        try {
            await CommunicationHistory.findByIdAndUpdate(communicationId, {
                deliveryStatus: 'pending'
            });
        } catch (error) {
            console.error("[BULK EMAIL] Failed to update communication history:", error);
        }
    }

    // Send emails in batches to avoid rate limiting
    const batchSize = 10; // SendGrid allows up to 1000 per request, but we'll be conservative
    const batches: string[][] = [];
    
    for (let i = 0; i < recipients.length; i += batchSize) {
        batches.push(recipients.slice(i, i + batchSize));
    }

    for (const batch of batches) {
        const batchPromises = batch.map(async (email: string): Promise<EmailResult> => {
            try {
                const msg = {
                    to: email,
                    from: {
                        email: process.env.SENDGRID_FROM_EMAIL || "noreply@naape.ng",
                        name: "NAAPE"
                    },
                    subject,
                    text,
                    html: html || text.replace(/\n/g, "<br>"),
                };

                const response = await sgMail.send(msg);
                const messageId = response[0]?.headers?.['x-message-id'] || 'unknown';
                
                console.log(`[BULK EMAIL] ✓ Email sent successfully to ${email}, Message ID: ${messageId}`);
                successful++;
                
                return {
                    email,
                    status: 'sent',
                    messageId
                };
            } catch (error: any) {
                console.error(`[BULK EMAIL] ✗ Failed to send email to ${email}:`, error);
                failed++;
                
                return {
                    email,
                    status: 'failed',
                    error: error.message || 'Unknown error'
                };
            }
        });

        // Wait for current batch to complete before starting next batch
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process batch results
        batchResults.forEach((result) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                // This shouldn't happen since we handle errors in the promise
                console.error("[BULK EMAIL] Unexpected batch error:", result.reason);
                results.push({
                    email: 'unknown',
                    status: 'failed',
                    error: result.reason?.message || 'Batch processing error'
                });
                failed++;
            }
        });

        // Add a small delay between batches to be respectful to SendGrid
        if (batches.indexOf(batch) < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
    }

    // Update communication history with final results
    if (communicationId) {
        try {
            const finalStatus = failed === 0 ? 'delivered' : (successful === 0 ? 'failed' : 'delivered');
            const errorMessage = failed > 0 ? `${failed} out of ${recipients.length} emails failed to send` : undefined;
            
            await CommunicationHistory.findByIdAndUpdate(communicationId, {
                deliveryStatus: finalStatus,
                errorMessage
            });
        } catch (error) {
            console.error("[BULK EMAIL] Failed to update final communication history:", error);
        }
    }

    const result: BulkEmailResult = {
        total: recipients.length,
        successful,
        failed,
        results
    };

    console.log(`[BULK EMAIL] Bulk email send completed. ${successful} successful, ${failed} failed out of ${recipients.length} total`);
    
    return result;
};

// Enhanced single email function with delivery tracking
export const sendEmailWithTracking = async (
    to: string, 
    subject: string, 
    text: string, 
    html?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    try {
        console.log(`[EMAIL] Attempting to send email to: ${to}`);
        console.log(`[EMAIL] Subject: ${subject}`);
        
        const msg = {
            to,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL || "noreply@naape.ng",
                name: "NAAPE"
            },
            subject,
            text,
            html: html || text.replace(/\n/g, "<br>"),
        };

        const response = await sgMail.send(msg);
        const messageId = response[0]?.headers?.['x-message-id'] || 'unknown';
        
        console.log(`[EMAIL] ✓ Email sent successfully to ${to}, Message ID: ${messageId}`);
        
        return {
            success: true,
            messageId
        };
    } catch (error: any) {
        console.error(`[EMAIL] ✗ SendGrid email error for ${to}:`, error);
        if (error.response) {
            console.error("[EMAIL] SendGrid error details:", error.response.body);
        }
        
        return {
            success: false,
            error: error.message || 'Unknown error'
        };
    }
};

// Get delivery status from SendGrid (webhook handler would update this)
export const updateDeliveryStatus = async (messageId: string, status: string) => {
    try {
        await CommunicationHistory.findOneAndUpdate(
            { sendGridMessageId: messageId },
            { deliveryStatus: status }
        );
        console.log(`[EMAIL] Updated delivery status for message ${messageId}: ${status}`);
    } catch (error) {
        console.error(`[EMAIL] Failed to update delivery status for message ${messageId}:`, error);
    }
};