const bcrypt = require('bcrypt');
const assert = require('assert');

const Models = require('../../../database/models');
const { User, Admin, Product } = require('../../../database/models');
const { generateRandomProductData } = require('./utils');

exports.clearDb = async () => {
	try {
		for (const ModelName in Models) {
			const Model = Models[ModelName];
			const getNoOfDocs = async () => {
				return await Model.find().countDocuments();
			};
			let count = await getNoOfDocs();
			if (count > 0) {
				await this.clearModel(Model);
			}
			count = await getNoOfDocs();
			assert.strictEqual(count, 0, 'deletion not complete');
		}
	} catch (error) {
		throw new Error(error);
	}
};

exports.clearModel = async Model => {
	const noOfDocs = async () => {
		return await Model.countDocuments();
	};
	await Model.deleteMany();
	const countAfterDeletion = await noOfDocs();
	assert.strictEqual(
		countAfterDeletion,
		0,
		`the model (${Model.modelName} not cleared completely.`
	);
};

exports.hashPassword = async password => {
	return await bcrypt.hash(password, 12);
};

exports.confirmPassword = async (password, hashePassword) => {
	return await bcrypt.compare(password, hashePassword);
};



exports.createDocForType = async (type, data) => {
	switch (type) {
		case 'Admin':
			return await this.createAdminWithData(data);
			break;
		case 'User':
			return await this.createUserWithData(data);
			break;
		default:
			break;
	}
};

exports.fetchByIdForType = async (type, id) => {
	switch (type) {
		case 'Admin':
			return await fetchById(Admin, id);
			break;
		case 'User':
			return await fetchById(User, id);
			break;
		default:
			break;
	}
};
const fetchById = async (Model, id) => {
	return await Model.findById(id);
};

exports.createAdminWithData = async data => {
	return await createInModelWithData(Admin, data);
};
exports.createUserWithData = async data => {
	return await createInModelWithData(User, data);
};

exports.createTestProducts = async (adminIDs = [], quantity = 1) => {
	const products = [];
	let product;
	const numberOfAdmins = adminIDs.length;
	for (let index = 0; index < quantity; index++) {
		const adminIndex = index % numberOfAdmins;
		const adminId = adminIDs[adminIndex];
		product = generateRandomProductData(adminId);
		product.sellingPrice = (
			(1 + product.percentageProfit / 100) *
			product.buyingPrice
		).toFixed(2);
		product = new Product(product);
		product = await product.save();
		products[index] = product;
	}
	return products;
};

const createInModelWithData = async (Model, data) => {
	const hashedPassword = await bcrypt.hash(data.password, 12);
	const dataToSave = {};
	for (const key in data) {
		if (data.hasOwnProperty(key)) {
			if (key === 'password') continue;
			dataToSave[key] = data[key];
		}
	}
	dataToSave.password = hashedPassword;
	let document = new Model(dataToSave);
	document = await document.save();
	return document;
};