import emailjs from '@emailjs/browser';

// Initialize EmailJS with your public key
emailjs.init("IdEvSdgXSD0BfCNpv");

// Define your EmailJS credentials - make sure these match exactly with your dashboard
const EMAILJS_SERVICE_ID = "service_lnpua4s";
const EMAILJS_TEMPLATE_ID = "template_4lg2wig";
const EMAILJS_PUBLIC_KEY = "IdEvSdgXSD0BfCNpv";

export const sendEmailWithPDF = async (userEmail, content, subject) => {
    try {
        console.log('Starting email send process...', {
            email: userEmail,
            contentLength: content.length,
            subject
        });

        // Format the content for email
        const formattedContent = content.map(msg => 
            `${msg.role === 'user' ? 'You' : 'Assistant'}: ${msg.content}`
        ).join('\n\n');

        // Create template parameters
        const templateParams = {
            to_name: userEmail.split('@')[0],
            from_name: "AI Chat Assistant",
            message: formattedContent,
            to_email: userEmail,
            subject: subject || 'Chat Summary'
        };

        console.log('Sending email with params:', templateParams);

        // Send email using EmailJS
        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY
        );

        console.log('Email sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Detailed email error:', {
            error: error,
            status: error.status,
            text: error.text
        });
        throw new Error(`Failed to send email: ${error.text || error.message}`);
    }
}; 