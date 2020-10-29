const {By} = require("selenium-webdriver");

class Page {
  constructor(driver) {
    this.driver = driver;
  }
  async openUrl(url) {
    try {
      await this.driver.get(url);
    } catch (error) {
      throw new Error(error);
    }
  }

  async getElementsWithClassName(className) {
    return await this.driver.findElements(By.className(className));
  }

  async clickById(id) {
    try {
      await this.driver.findElement(By.css(`#${id}`)).click();
    } catch (error) {
      throw new Error(error);
    }
  }
  async extractTextById(id) {
    try {
      return await this.driver.findElement(By.css(`#${id}`)).getText();
    } catch (error) {
      throw new Error(error);
    }
  }
  async enterTextById(id, data) {
    try {
      return await this.driver.findElement(By.css(`#${id}`)).sendKeys(data);
    } catch (error) {
      throw new Error(error);
    }
  }
  async findElementsByClassName(className) {
    try {
      return await this.driver.findElements(By.className(className));
    } catch (error) {
      throw new Error(error);
    }
  }
  async clickByCss(cssPath) {
    try {
      return await this.driver.findElement(By.css(cssPath)).click();
    } catch (error) {
      throw new Error(error);
    }
  }
  async extractTextByCss(cssPath) {
    try {
      return await this.driver.findElement(By.css(cssPath)).getText();
    } catch (error) {
      throw new Error(error);
    }
  }

  async clickLink(linkText) {
    try {
      await this.driver.findElement(By.linkText(linkText)).click();
    } catch (error) {
      throw new Error(error);
    }
  }

  async enterDataByName(name, data) {
    try {
      await this.driver.findElement(By.name(name)).sendKeys(data);
    } catch (error) {
      throw new Error(error);
    }
  }
  async extractTextByName(name) {
    try {
      return await this.driver.findElement(By.name(name)).getText();
    } catch (error) {
      throw new Error(error);
    }
  }
  async extractTextByClassName(className) {
    try {
      return await this.driver.findElement(By.className(className)).getText();
    } catch (error) {
      throw new Error(error);
    }
  }
  async clickByClassName(className) {
    try {
      await this.driver.findElement(By.className(className)).click();
    } catch (error) {
      throw new Error(error);
    }
  }
  async hold(ms) {
    try {
      await this.driver.sleep(ms);
    } catch (error) {
      throw new Error(error);
    }
  }
  async getTitle() {
    try {
      return await this.driver.getTitle();
    } catch (error) {
      throw new Error(error);
    }
  }
  async getError() {
    try {
      const errorMessage = await this.extractTextByClassName("error-message");
      return errorMessage;
    } catch (error) {
      throw new Error(error);
    }
  }
  async getInfo() {
    try {
      const info = await this.extractTextByClassName("info");
      return info;
    } catch (error) {
      throw new Error(error);
    }
  }
  async close() {
    try {
      await this.driver.quit();
    } catch (error) {
      throw new Error(error);
    }
  }
}

module.exports = Page;
