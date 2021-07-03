const ObjectId = require('mongoose').Types.ObjectId;

const { unlink, readdir } = require('fs');
const path = require('path');

exports.generateStringSizeN = function (N) {
	let string = '';
	const character = 's';
	for (let i = 1; i <= N; i++) {
		if (i % 2 === 0) {
			string += `${Math.floor(Math.random() * 10)}`;
		} else {
			string += character;
		}
	}
	return string;
};

exports.returnObjectWithoutProp = function (obj, key) {
	const result = {};
	for (const prop in obj) {
		if (prop === key) {
			continue;
		}
		result[prop] = obj[prop];
	}
	return result;
};

exports.generateRandomIntInRange = (min, max) => {
	return Math.floor(this.generateRandomFloatInRange(min, max));
};
exports.generateRandomFloatInRange = function (min, max) {
	return min + Math.random() * (max - min);
};

exports.generateMongooseId = () => {
	return ObjectId();
};

exports.generateRandomMongooseIds = quantity => {
	const Ids = [];
	for (let i = 0; i < quantity; i++) {
		Ids.push(this.generateMongooseId());
	}
	return Ids;
};

exports.generateRandomProductData = adminId => {
	const data = {};
	const PRODUCT_PROPERTIES = this.PRODUCT_PROPERTIES;
	for (const key in PRODUCT_PROPERTIES) {
		if (key === 'adminId') {
			data[key] = adminId;
			continue;
		}
		if (PRODUCT_PROPERTIES[key].type === String) {
			data[key] = `${key} ${Math.floor(Math.random() * 100)}`;
			continue;
		}
		if (key === 'percentageProfit') {
			data[key] = Math.floor(Math.random() * 100);
			continue;
		}
		if (PRODUCT_PROPERTIES[key].type === Number) {
			data[key] = Math.floor(Math.random() * 100) + 100;
		}
	}
	return data;
};

exports.deleteAllCreatedImages = async () => {
	return new Promise((resolve, reject) => {
		const pathString = path.resolve('Data', 'Images');

		readdir(pathString, (err, files) => {
			if (err) return reject(err);
			for (const file of files) {
				unlink(path.join(pathString, file), err => {
					if (err) return reject(err);
				});
			}
		});
		resolve();
	});
};

exports.PRODUCT_PROPERTIES = {
	title: { type: String },
	imageUrl: {
		type: String,
	},
	buyingPrice: {
		type: Number,
	},
	percentageProfit: {
		type: Number,
	},
	description: {
		type: String,
	},
	quantity: {
		type: Number,
	},
	adminId: {
		type: String,
	},
	category: {
		type: String,
	},
	brand: {
		type: String,
	},
};
