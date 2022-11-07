import randomUseragent from "random-useragent";

//Enable stealth mode
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

async function createPage(browser, url) {
    //Randomize User agent or Set a valid one
    const defaultAgent =
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36";
    const userAgent = randomUseragent.getRandom();
    const UA = userAgent || defaultAgent;
    const page = await browser.newPage();

    //Randomize viewport size
    await page.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 3000 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: false,
        isMobile: false,
    });

    await page.setUserAgent(UA);
    await page.setJavaScriptEnabled(true);
    await page.setDefaultNavigationTimeout(0);

    //Skip images/styles/fonts loading for performance
    await page.setRequestInterception(true);
    page.on("request", (req) => {
        if (
            req.resourceType() == "stylesheet" ||
            req.resourceType() == "font" ||
            req.resourceType() == "image"
        ) {
            req.abort();
        } else {
            req.continue();
        }
    });

    await page.evaluateOnNewDocument(() => {
        // Pass webdriver check
        Object.defineProperty(navigator, "webdriver", {
            get: () => false,
        });
    });

    await page.evaluateOnNewDocument(() => {
        // Pass chrome check
        window.chrome = {
            runtime: {},
            // etc.
        };
    });

    await page.evaluateOnNewDocument(() => {
        //Pass notifications check
        const originalQuery = window.navigator.permissions.query;
        return (window.navigator.permissions.query = (parameters) =>
            parameters.name === "notifications"
                ? Promise.resolve({ state: Notification.permission })
                : originalQuery(parameters));
    });

    await page.evaluateOnNewDocument(() => {
        // Overwrite the `plugins` property to use a custom getter.
        Object.defineProperty(navigator, "plugins", {
            // This just needs to have `length > 0` for the current test,
            // but we could mock the plugins too if necessary.
            get: () => [1, 2, 3, 4, 5],
        });
    });

    await page.evaluateOnNewDocument(() => {
        // Overwrite the `languages` property to use a custom getter.
        Object.defineProperty(navigator, "languages", {
            get: () => ["en-US", "en"],
        });
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
    return page;
}

async function parseUrl(url) {
    try {
        const browser = await puppeteer.launch({
            channel: "chrome",
            headless: false,
        });
        const page = await createPage(browser, url);
        const text = await page.waitForSelector("#data");
        const json = await text.evaluate((el) => el.textContent);
        await browser.close();
        const data = JSON.parse(json);
        return data;
    } catch (e) {
        return parseUrl(url);
    }
}

console.log(await parseUrl("https://dev.amidstyle.com"));
