const { PRODUCTS_PER_PAGE } = require('../../../config/env');
const { Product, Metadata } = require('../../../database/models');
const {
	createTestProducts,
	clearDb,
} = require('../../utils/generalUtils/database');
const {
	generatePerfectProductData,
	returnObjectWithoutProp,
	generateMongooseId,
	generateRandomMongooseIds,
	generateStringSizeN,
} = require('../../utils/generalUtils/utils');
const {
	verifyEqual,
	ensureObjectHasKeyValuePair,
	verifyTruthy,
	verifyRejectsWithError,
	ensureArrayContains,
	verifyIDsAreEqual,
	ensureResolvesToNull,
	verifyResolvesWithData,
} = require('../../utils/testsUtils');

const {
	ranges,
	ValidationError,
	validateStringField,
	validateFloatField,
} = require('../utils');
const {
	createProductsWithAdminIdAndCategory,
	modifyProductsCategories,
	validateDisplayData,
	ensureMetadataIsAdded,
	ensureHasValidSellingPrice,
	ensureProductsHaveAdminId,
} = require('./utils');

const prodRanges = ranges.product;
const MAX_SETUP_TIME = 20000;

module.exports = () => {
	const { createOne } = Product;
	describe('CreateOne', () => {
		afterEach(async () => {
			await clearDb();
		});

		const valid = generatePerfectProductData();
		const strings = ['title', 'imageUrl', 'description', 'category', 'brand'];
		for (const field of strings) {
			describe(field, () => {
				const otherFields = returnObjectWithoutProp(valid, field);
				const { minlength, maxlength } = prodRanges[field];
				const data = {
					func: createOne,
					field,
					minlength,
					maxlength,
					otherFields,
					err: ValidationError,
				};
				validateStringField(data);
			});
		}
		const numerics = ['buyingPrice', 'percentageProfit', 'quantity'];
		for (const field of numerics) {
			describe(field, () => {
				const otherFields = returnObjectWithoutProp(valid, field);
				const { min, max } = prodRanges[field];
				const data = {
					func: createOne,
					field,
					lowerlimit: min,
					upperlimit: max,
					otherFields,
					err: ValidationError,
				};
				validateFloatField(data);
			});
		}

		describe('should add both category and brand to the metadata table ', () => {
			let productData;
			beforeEach(async () => {
				productData = generatePerfectProductData();
				await createOne(productData);
			});
			it('ensure that both categories and brand are added to metadata', async () => {
				await ensureMetadataIsAdded(productData);
			});
		});

		it('ensure selling price is calculated', async () => {
			const created = await createOne(valid);
			ensureHasValidSellingPrice(created, valid);
		});

		describe('AdminId', () => {
			it('invalid', async () => {
				const field = 'adminId';
				const invalid = generateStringSizeN(ranges.mongooseId);
				const body = returnObjectWithoutProp(valid, field);
				body[field] = invalid;
				await verifyRejectsWithError(async () => {
					await Product.createOne(body);
				}, ValidationError);
			});
			it('valid', async () => {
				//props has all the desired fields
				//including the adminId, if function
				//does not throw then it accepts valid
				//adminIds.
				await expect(Product.createOne(valid)).resolves.not.toThrow();
			});
		});
	});
	describe('findProductsForPage', () => {
		it('should return null on empty database', async () => {
			await expect(Product.findProductsForPage(1)).resolves.toBeNull();
		});
		describe('NonEmpty db', () => {
			const TRIALS = 20;
			let adminIds;
			beforeAll(async () => {
				//an admin will have many products, hence the
				//number of admins should be less than no of
				//products generated.
				adminIds = generateRandomMongooseIds(Math.floor(TRIALS / 4));
				await createTestProducts(adminIds, TRIALS);
			});
			afterAll(async () => {
				await clearDb();
			});
			it('returns products for first page ', async () => {
				const first = 1;
				const productData = await Product.findProductsForPage(first);
				validateDisplayData(productData, first);
			});
		});
	});
	describe('findCategories', () => {
		it('return null on empty db', async () => {
			const categories = await Product.findCategories();
			verifyEqual(categories.length, 0);
		});
		describe('non Empty db', () => {
			const category = 'category1';
			beforeAll(async () => {
				const productData = generatePerfectProductData();
				productData.category = category;
				await createOne(productData);
			}, MAX_SETUP_TIME);
			afterAll(async () => {
				await clearDb();
			});
			it('return all categories', async () => {
				const actual = await Product.findCategories();
				ensureArrayContains(actual, category);
			});
		});
	});
	describe('findCategoriesforAdminId', () => {
		let adminId = generateMongooseId();
		it('return null on empty db', async () => {
			const categories = await Product.findCategoriesForAdminId(adminId);
			verifyEqual(categories.length, 0);
		});
		describe('non Empty db', () => {
			const example = {
				category: 'category 1',
				adminId,
			};
			beforeAll(async () => {
				const productData = generatePerfectProductData();
				productData.category = example.category;
				productData.adminId = adminId;
				await createOne(productData);
			}, MAX_SETUP_TIME);
			afterAll(async () => {
				await clearDb();
			});
			it('return all for adminId', async () => {
				const actual = await Product.findCategoriesForAdminId(adminId);
				ensureArrayContains(actual, example.category);
			});
		});
	});

	describe('findCategoryProductsForAdminIdAndPage', () => {
		let adminId = generateMongooseId();
		it('returns empty array on empty db', async () => {
			const page = 1;
			const retrieved = await Product.findCategoryProductsForAdminIdAndPage(
				adminId,
				page
			);
			verifyEqual(retrieved.products.length, 0);
		});
		describe('non empty db', () => {
			afterEach(async () => {
				await clearDb();
			});
			it('should filter out products for admin Id', async () => {
				const testCategory = 'category 1';
				const product1 = generatePerfectProductData();
				product1.adminId = adminId;
				product1.category = testCategory;
				const product2 = generatePerfectProductData();
				product2.adminId = adminId;
				product2.category = testCategory;

				const product3 = generatePerfectProductData();
				product3.adminId = adminId;
				product3.category = 'some category';
				const product4 = generatePerfectProductData();
				product4.adminId = generateMongooseId();
				const products = [product1, product2, product3, product4];
				for (const product of products) {
					await Product.createOne(product);
				}
				const page = 1;
				const retrieved = await Product.findCategoryProductsForAdminIdAndPage(
					adminId,
					testCategory,
					page
				);
				const retrievedProducts = retrieved.products;
				verifyEqual(retrievedProducts.length, 2);
				ensureProductsHaveAdminId(retrievedProducts, adminId);
				ensureObjectHasKeyValuePair(
					retrieved.paginationData,
					'currentPage',
					page
				);
			});

			it('should lender upto to the PRODUCTS_PER_PAGE limit', async () => {
				const num = 50;
				const category = 'category 1';
				await createProductsWithAdminIdAndCategory(num, adminId, category);
				const page = 2;
				const retrieved = await Product.findCategoryProductsForAdminIdAndPage(
					adminId,
					category,
					page
				);
				const retrievedProducts = retrieved.products;
				ensureProductsHaveAdminId(retrievedProducts, adminId);
				verifyEqual(retrievedProducts.length, PRODUCTS_PER_PAGE);
				ensureObjectHasKeyValuePair(
					retrieved.paginationData,
					'hasNextPage',
					true
				);
			});
		});
	});
	describe('findCategoryProductsForPage', () => {
		it('should return null when database is empty.', async () => {
			const category = 'category 1';
			const page = 1;
			await expect(
				Product.findCategoryProductsForPage(category, page)
			).resolves.toBeNull();
		});
		describe('Non Empty database', () => {
			const categories = ['category1', 'categoty2', 'category3', 'category4'];
			const TRIALS = 50;
			let adminIds;
			let products;
			beforeAll(async () => {
				adminIds = generateRandomMongooseIds(Math.floor(TRIALS / 4));
				products = await createTestProducts(adminIds, TRIALS);
				await modifyProductsCategories(products, categories);
			});
			afterAll(async () => {
				await clearDb();
			});
			it('returns products for first page ', async () => {
				const page = 1;
				for (const category of categories) {
					const productData = await Product.findCategoryProductsForPage(
						category,
						page
					);
					validateProductForCategory(category, productData, page);
				}
			});
			it('returns products for last page ', async () => {
				const page = Math.floor(
					TRIALS / (PRODUCTS_PER_PAGE * categories.length)
				);
				for (const category of categories) {
					const productData = await Product.findCategoryProductsForPage(
						category,
						page
					);
					validateProductForCategory(category, productData, page);
				}
			});
			it('returns null if the category is not in db', async () => {
				const category = 'category 5';
				const page = 1;
				await expect(
					Product.findCategoryProductsForPage(category, page)
				).resolves.toBeNull();
			});
			function validateProductForCategory(category, productData, page) {
				validateDisplayData(productData, page);
				for (const product of productData.products) {
					verifyEqual(product.category, category);
				}
			}
		});
	});
};
