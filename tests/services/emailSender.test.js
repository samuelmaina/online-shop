const emailSender = require('../../utils/emailSender');

describe.skip('Email Sender', () => {
	it('should send emails', async () => {
		const body = {
			subject: 'Test',
			replyTo: 'Samuel Maina',
			text: 'I am sending an email from nodemailer!',
			to: receiver,
			from: process.env.EMAIL,
		};
		await emailSender(body);
	});
});
