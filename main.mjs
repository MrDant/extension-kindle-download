import puppeteer from "puppeteer";

var currentImg = null;
(async () => {
  const url = "https://lire.amazon.fr/kindle-library";
  const email = "";
  const password = "";
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  page.setViewport({
    width: 1000,
    height: 1200,
  });

  // Navigate the page to a URL
  await page.goto(url);
  let isGoodPage = page.url() == url;
  while (!isGoodPage) {
    const currentUrl = new URL(page.url());
    switch (currentUrl.origin + currentUrl.pathname) {
      case "https://lire.amazon.fr/landing":
        await page.click("#top-sign-in-btn");
      case "https://www.amazon.fr/ap/signin":
        const selector = "[type=email]";
        await page.waitForSelector(selector);
        await page.type(selector, email);
        await page.type("[type=password]", password);
        await page.click("#signInSubmit");
      default:
        console.log(page.url());
    }
    await page.waitForNavigation();
    isGoodPage = page.url() == url;
  }
  await page.waitForNavigation();
  await page.waitForSelector(".kg-full-page-img > img");
  const getImgBase64 = async () => {
    await page.waitForSelector(".kg-full-page-img > img", { visible: true });
    return await page.evaluate(async (currentImg) => {
      let img = document.querySelector(".kg-full-page-img > img");
      if (!img || img.src == currentImg) {
        return null;
      }
      currentImg = img.src;
      let canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      document.body.insertAdjacentElement("beforeend", canvas);
      canvas.getContext("2d").drawImage(img, 0, 0);
      const base64 = canvas.toDataURL("image/jpeg");
      canvas.remove();
      console.log("base64", base64);
      return base64;
    }, currentImg);
  };

  const rightSelector = "#kr-chevron-right";
  const leftSelector = "#kr-chevron-left";
  const readerSelector = ".kg-full-page-img > img";
  await page.waitForSelector(readerSelector);
  while (await page.$(leftSelector)) {
    try {
      await page.waitForSelector(leftSelector);
      await page.hover(leftSelector);
      await page.click(leftSelector, {});
    } catch (error) {
      console.log("error", error);
    }
    await page.waitForSelector(readerSelector);
  }

  const images = [];
  images.push(await getImgBase64());
  while (await page.$(rightSelector)) {
    try {
      await page.waitForSelector(rightSelector, { visible: true });
      await page.hover(rightSelector);
      await page.click(rightSelector, {});
    } catch (error) {
      console.log("error", error);
    }
    await page.waitForSelector(readerSelector);
    const base64 = await getImgBase64();
    images.push(base64);
  }

  let html = "<html><body>";
  [...new Set(images)]
    .filter((e) => e !== null)
    .forEach((base64) => {
      html += `<img src="${base64}" /><br />`;
    });
  html += "</body></html>";

  // Charger l'HTML dans la page Puppeteer
  await page.setContent(html);
})();
