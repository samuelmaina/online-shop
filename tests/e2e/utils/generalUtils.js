const { session } = require('.');
const {
	Product,
	Metadata,
	Order,
	AdminSales,
} = require('../../../database/models');
const { clearModel, clearDb } = require('../../utils/generalUtils/database');
const { closeApp } = require('../config');

exports.ensureHasTitleAndError = async (
	page,
	expectedTitle,
	expectedErrorMessage
) => {
	const title = await page.getTitle();
	const error = await page.getError();
	expect(title).toEqual(expectedTitle);
	expect(error).toEqual(expectedErrorMessage);
};

exports.clearModelsInProductTests = async () => {
	await clearModel(Product);
	await clearModel(Metadata);
	await clearModel(Order);
	await clearModel(AdminSales);
};
exports.includeTearDowns = async page => {};

exports.ensureHasTitleAndInfo = async (page, expectedTitle, expectedInfo) => {
	const title = await page.getTitle();
	const info = await page.getInfo();
	expect(title).toEqual(expectedTitle);
	expect(info).toEqual(expectedInfo);
};

exports.ensureHasTitle = async (page, title) => {
	expect(await page.getTitle()).toBe(title);
};

exports.ensureHasTitleAfterClickingLink = async (page, link, title) => {
	await page.clickLink(link);
	await this.ensureHasTitle(page, title);
};

exports.ensureHasTitleAfterClickingId = async (page, id, title) => {
	await page.clickById(id);
	await this.ensureHasTitle(page, title);
};
