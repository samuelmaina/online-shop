const { TokenGenerator } = require('../../database/models');

const { validationResults, Renderer, Flash } = require('../../utils');

class Auth {
	constructor(Model, type) {
		this.Model = Model;
		if (type === 'admin') this.person = 'Admin';
		else this.person = 'User';
		this.type = type;
		const baseRoute = `/auth/${this.type}`;
		this.routes = {
			signUp: `${baseRoute}/sign-up`,
			logIn: `${baseRoute}/log-in`,
			reset: `${baseRoute}/reset`,
			newPassword: `${baseRoute}/new-password`,
			adminSuccessfulLoginRedirect: '/admin/products?page=1',
			userSuccessfulLoginRedirect: '/products?page=1',
		};
	}

	getSignUp(req, res, next) {
		const renderer = new Renderer(res)
			.templatePath('auth/signup')
			.pageTitle(`${this.person} Sign Up`);
		if (this.type === 'admin') {
			renderer.activePath('/admin/signup');
		} else {
			renderer.activePath('/signup');
		}
		renderer.pathToPost(this.routes.signUp).render();
	}
	async postSignUp(req, res, next) {
		try {
			const flash = new Flash(req, res).appendPreviousData(req.body);
			const validationErrors = validationResults(req);
			if (validationErrors) {
				return flash.appendError(validationErrors).redirect(this.routes.signUp);
			}
			const existingEmail = await this.Model.findByEmail(req.body.email);
			if (existingEmail) {
				const errorMessage = 'Email already exists.Please try another one.';
				return flash.appendError(errorMessage).redirect(this.routes.signUp);
			}
			await this.Model.createOne(req.body);
			const successSignUpMessage = `Dear ${req.body.name}, You have successfully signed up.`;
			flash.appendInfo(successSignUpMessage).redirect(this.routes.logIn);
			// transporter.sendMail(emailBody);
		} catch (error) {
			next(error);
		}
	}

	getLogin(req, res, next) {
		try {
			const renderer = new Renderer(res)
				.templatePath('auth/login')
				.pageTitle(`${this.person} Log In`);
			if (this.type === 'admin') {
				renderer.activePath('/admin/login');
			} else {
				renderer.activePath('/login');
			}
			renderer.pathToPost(this.routes.logIn).render();
		} catch (error) {
			next(error);
		}
	}

	async postLogin(req, res, next) {
		try {
			const flash = new Flash(req, res).appendPreviousData(req.body);
			const { email, password } = req.body;
			const validationErrors = validationResults(req);
			if (validationErrors) {
				return flash.appendError(validationErrors).redirect(this.routes.logIn);
			}
			const document = await this.Model.findOneWithCredentials(email, password);
			if (!document) {
				return flash
					.appendError('Invalid Email or Password')
					.redirect(this.routes.logIn);
			}
			req.document = document;
			return next();
		} catch (error) {
			next(error);
		}
	}

	setSessionAuth(req) {
		if (this.type === 'admin') {
			req.session.isAdminLoggedIn = true;
			req.session.admin = req.document;
		} else {
			req.session.isUserLoggedIn = true;
			req.session.user = req.document;
		}
	}

	successfulLoginRedirect() {
		if (this.type === 'admin') {
			return this.routes.adminSuccessfulLoginRedirect;
		} else {
			return this.routes.userSuccessfulLoginRedirect;
		}
	}

	initializeSession(req, res, next) {
		try {
			this.setSessionAuth(req);
			return req.session.save(err => {
				if (err) throw new Error(err);
				res.redirect(this.successfulLoginRedirect());
			});
		} catch (error) {
			next(error);
		}
	}

	getReset(req, res, next) {
		new Renderer(res)
			.templatePath('auth/resetPassword')
			.pageTitle(`${this.person} Reset Password`)
			.pathToPost(this.routes.reset)
			.render();
	}

	async postReset(req, res, next) {
		try {
			const flash = new Flash(req, res).appendPreviousData(req.body);
			const email = req.body.email;
			const validationErrors = validationResults(req);
			if (validationErrors) {
				return flash.appendError(validationErrors).redirect(this.routes.reset);
			}
			const document = await this.Model.findByEmail(email);
			if (!document) {
				return flash
					.appendError(` No ${this.person} by that email exists.`)
					.redirect(this.routes.reset);
			}
			const token = await TokenGenerator.createOneForId(document.id);

			// transporter.send({
			//   //http://localhost:3000/auth/user/new-password/57543e4605348c1d428f72eff767487bd255983f74119b2b221cab4f2c28bbf3
			//   from: "samuelsonlineshop@online.com",
			//   to: document.email,
			//   subject: "Reset Password",
			//   html: `<strong> Dear ${document.name}</strong>,
			//            <br><p>You can click this link to reset your password :
			//            <a href='http://localhost:3000/${baseRoute}/newPassword/${token}'>
			//             Reset password</a></p>
			//            <p>Please note your have only one hour to reset your password</p>
			//            <br> Thank you `,
			// });
			flash
				.appendInfo(
					'A link has been sent to your email. Please click the link to reset password.'
				)
				.redirect(this.routes.logIn);
		} catch (error) {
			next(error);
		}
	}

	async getNewPassword(req, res, next) {
		try {
			const flash = new Flash(req, res);
			const token = req.params.token;
			const tokenDetails = await TokenGenerator.findTokenDetailsByToken(token);
			if (!tokenDetails) {
				return flash
					.appendError('Too late for reset. Please try again.')
					.appendPreviousData()
					.redirect(this.routes.reset);
			}
			return new Renderer(res)
				.templatePath('auth/newPassword')
				.pageTitle('New Password')
				.pathToPost(this.routes.newPassword)
				.activePath('/login')
				.appendDataToResBody({
					token,
				})
				.render();
		} catch (error) {
			next(error);
		}
	}
	async postNewPassword(req, res, next) {
		try {
			const { password, token } = req.body;

			const renderer = new Renderer(res)
				.templatePath('auth/newPassword')
				.pageTitle('New Password')
				.pathToPost(this.routes.newPassword)
				.activePath('/login')
				.appendDataToResBody({
					token,
				})
				.appendPreviousData(req.body);

			const validationErrors = validationResults(req);
			if (validationErrors) {
				return renderer.appendError(validationErrors).render();
			}

			const tokenDetails = await TokenGenerator.findTokenDetailsByToken(token);
			const document = await this.Model.findById(tokenDetails.requesterId);

			const resettingToSamePassword = await document.isCorrect(password);
			if (resettingToSamePassword) {
				return renderer
					.appendError('Can not reset to your old Password! Select another one')
					.render();
			}
			await document.update('password', password);
			new Flash(req, res)
				.appendInfo('Password reset successful.')
				.redirect(this.routes.logIn);
			tokenDetails.delete();
		} catch (error) {
			next(error);
		}
	}

	postLogout(req, res, next) {
		req.session.destroy(err => {
			if (err) {
				next(err);
			}
			res.redirect('/');
		});
	}
}

module.exports = Auth;
