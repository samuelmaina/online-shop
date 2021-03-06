const { AdminSales, User } = require('../database/models');

const path = require('path');

const { Flash, Renderer, validationResults } = require('../utils');

const { Product, Order } = require('../database/models');

const { shopServices } = require('../database/services');
const { productQuantityValidator, cartTotalValidator, pipeInvoicePdf } =
	shopServices;

exports.getIndex = async (req, res, next) => {
	try {
		const redirectUrl = '/';
		const flash = new Flash(req, res);
		const validationErrors = validationResults(req);
		if (validationErrors) {
			return flash.appendError(validationErrors).redirect(redirectUrl);
		}
		const categories = await Product.findCategories();
		//for now the home page will contain some few products
		//other logic may be added later.
		const productsData = await Product.findProductsForPage(1);
		new Renderer(res)
			.templatePath('shop/index')
			.pageTitle('SM Online Shop')
			.activePath('/')
			.appendDataToResBody({
				productsData,
				categories,
			})
			.render();
	} catch (error) {
		next(error);
	}
};
exports.getProductsPerCategory = async (req, res, next) => {
	try {
		const redirectUrl = '/products?page=1';
		const flash = new Flash(req, res);
		const validationErrors = validationResults(req);
		if (validationErrors) {
			return flash.appendError(validationErrors).redirect(redirectUrl);
		}
		const page = +req.query.page || 1;
		const category = req.params.category;
		const categories = await Product.findCategories();
		const productsData = await Product.findCategoryProductsForPage(
			category,
			page
		);
		return new Renderer(res)
			.templatePath('shop/products-list')
			.pageTitle(`${category}`)
			.appendDataToResBody({
				productsData,
				categories,
			})
			.render();
	} catch (error) {
		next(error);
	}
};
exports.getProducts = async (req, res, next) => {
	try {
		const redirectUrl = '/products/?page=1';
		const flash = new Flash(req, res);
		const validationErrors = validationResults(req);
		if (validationErrors) {
			return flash.appendError(validationErrors).redirect(redirectUrl);
		}
		const page = +req.query.page || 1;
		const categories = await Product.findCategories();
		const productsData = await Product.findProductsForPage(page);

		new Renderer(res)
			.templatePath('shop/products-list')
			.pageTitle('Products')
			.activePath('/products')
			.appendDataToResBody({
				productsData,
				categories,
			})
			.render();
	} catch (err) {
		next(err);
	}
};

exports.getProduct = async (req, res, next) => {
	try {
		const prodId = req.params.productId;
		const page = +req.query.page || 1;
		const product = await Product.findById(prodId);
		if (!product) {
			return res.redirect('/');
		}
		new Renderer(res)
			.templatePath('shop/product-detail')
			.pageTitle(product.title)
			.activePath('/product')
			.appendDataToResBody({
				product,
				currentPage: page,
			})
			.render();
	} catch (error) {
		next(error);
	}
};

exports.getAddToCart = async (req, res, next) => {
	try {
		const { productId, page } = req.body;
		const product = await Product.findById(productId);

		new Renderer(res)
			.templatePath('shop/add-to-cart')
			.pageTitle('Add To Cart')
			.appendDataToResBody({
				product,
				page,
			})
			.render();
	} catch (error) {}
};
exports.postToCart = async (req, res, next) => {
	try {
		let { page, quantity, productId } = req.body;
		const previousData = req.body;

		const product = await Product.findById(productId);
		const renderer = new Renderer(res)
			.templatePath('shop/add-to-cart')
			.pageTitle('Add To Cart')
			.appendDataToResBody({
				page,
				product,
				previousData,
			});

		const quantityError = productQuantityValidator(product, quantity);
		if (quantityError) return renderError(quantityError);
		let total = 0.0;
		if (req.session.total) {
			total = req.session.total;
		}
		const productTotal = product.sellingPrice * quantity;
		const balanceError = cartTotalValidator(
			total,
			productTotal,
			req.user.balance
		);
		if (balanceError) return renderError(balanceError);
		req.session.total += productTotal;
		await req.user.decrementBalance(productTotal);
		await req.user.addProductsToCart(productId, quantity);
		await product.decrementQuantity(quantity);
		new Flash(req, res)
			.appendInfo('Product successfully added to cart.')
			.redirect(`products?page=${page}`);

		function renderError(err) {
			return renderer.appendError(err).render();
		}
	} catch (error) {
		next(error);
	}
};

exports.getCart = async (req, res, next) => {
	try {
		const { cart, total } = await req.user.populateCartProductsDetails();

		//put this data in the session incase the user will order the product when
		//they view the cart
		req.session.total = total;
		req.session.orderedProducts = req.user.cart;

		new Renderer(res)
			.templatePath('shop/cart')
			.pageTitle('Your Cart')
			.appendDataToResBody({
				products: cart,
				total,
			})
			.activePath('/cart')
			.render();
	} catch (error) {
		next(error);
	}
};

exports.postCartDeleteProduct = async (req, res, next) => {
	try {
		const prodId = req.body.productId;
		const deletedQuantity = await req.user.deleteProductIdFromCart(prodId);
		res.redirect('/cart');
		const product = await Product.findById(prodId);
		//increase the quantity earlier deleted since the product(s) were rejected
		await product.incrementQuantity(deletedQuantity);
		// refund the customer
		await req.user.incrementAccountBalance(
			deletedQuantity * product.sellingPrice
		);
	} catch (error) {
		next(error);
	}
};
exports.createOrder = async (req, res, next) => {
	try {
		const { orderedProducts, total } = req.session;
		const userId = req.user._id;
		const orderData = {
			userId: userId,
			products: orderedProducts,
			total,
		};
		const order = await Order.createOne(orderData);
		await req.user.clearCart();
		res.redirect('/orders');
		await order.populateDetails();
		await AdminSales.addSalesToAdmins(order.products);
	} catch (error) {
		next(error);
	}
};
exports.getOrders = async (req, res, next) => {
	try {
		const orders = await Order.findAllforUserId(req.user._id);
		if (orders)
			new Renderer(res)
				.templatePath('shop/orders')
				.pageTitle('Your Orders')
				.activePath('/orders')
				.appendDataToResBody({
					orders,
				})
				.render();
	} catch (error) {
		next(error);
	}
};

exports.createInvoicePdf = async (req, res, next) => {
	try {
		const flash = new Flash(req, res);
		const orderId = req.params.orderId;
		const invoiceName = 'invoice-' + orderId + '.pdf';
		const invoicePath = path.join('Data', 'Invoices', invoiceName);
		const order = await Order.findByIdAndPopulateProductsDetails(orderId);
		if (!order) {
			return flash.appendError('No such order exists').redirect('/orders');
		}
		if (!order.isOrderedById(req.user.id)) {
			return flash
				.appendError('You are not authorized to operate on this order')
				.redirect('/orders');
		}
		setHeaderForPiping(res, invoiceName);

		await pipeInvoicePdf(order, res, User);
	} catch (error) {
		next(error);
	}
};

const setHeaderForPiping = (res, invoiceName) => {
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader(
		'Content-Disposition',
		'inline; filename="' + invoiceName + '"'
	);
};
