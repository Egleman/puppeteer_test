const puppeteer = require('puppeteer')
const fs = require('fs')

const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

;(async () => {
  const [, , url, region] = process.argv

  if (!url || !region) {
    console.error('Необходимо указать URL и регион.')
    process.exit(1)
  }

  const browser = await puppeteer.launch({
    headless: false, // Запускаем в обычном режиме
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
  })
  const page = await browser.newPage()

  // Получаем размеры экрана
  const { width, height } = await page.evaluate(() => {
    return {
      width: window.screen.width,
      height: window.screen.height
    }
  })

  // Устанавливаем размеры окна
  await page.setViewport({ width, height })

  // Установка пользовательского агента
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  )

  // Переход к сайту
  await page.goto(url, { waitUntil: 'networkidle2' })

  await sleep(4000)

  //Выбор региона
  await page.click('.UiHeaderHorizontalBase_region__2ODCG')

  await sleep(2000)

  await page.waitForSelector('.UiRegionListBase_item___ly_A')

  //Поиск и выбор региона из списка
  const regions = await page.$$('.UiRegionListBase_item___ly_A')
  for (let regionElement of regions) {
    const text = await page.evaluate((el) => el.innerText, regionElement)
    if (text.includes(region)) {
      await regionElement.click()
      break
    }
  }

  await sleep(2000)

  // Сбор данных о товаре
  const productData = await page.evaluate(() => {
    const priceElement = document.querySelector(
      '.ProductPage_informationBlock__vDYCH .Buy_root__I5P_2.Buy_background_gray__gdzFd.Buy_view_long__mJ_ER > .PriceInfo_root__GX9Xp > span.Price_price__QzA8L'
    )
    const oldPriceElement = document.querySelector(
      '.ProductPage_informationBlock__vDYCH .Buy_root__I5P_2.Buy_background_gray__gdzFd.Buy_view_long__mJ_ER > .PriceInfo_root__GX9Xp > .PriceInfo_oldPrice__IW3mC > .Price_price__QzA8L'
    )
    const oldPriceElementRank = oldPriceElement
      ? oldPriceElement.querySelector('span .Price_fraction__lcfu_')
      : null
    const ratingElement = document.querySelector('meta[itemprop="ratingValue"]')
    const reviewsElement = document.querySelector(
      'meta[itemprop="reviewCount"]'
    )

    const price = priceElement
      ? priceElement.textContent.replace(/[^0-9,.]/g, '')
      : null
    const oldPrice = oldPriceElement
      ? parseInt(oldPriceElement.textContent)
      : null
    const oldPriceRank = oldPriceElementRank
      ? oldPriceElementRank.textContent.replace(/[^0-9]/g, '')
      : null
    const rating = ratingElement ? ratingElement.getAttribute('content') : null
    const reviews = reviewsElement
      ? reviewsElement.getAttribute('content')
      : null

    const getFullPrice = (firstPrice, secondPrice) => {
      if (firstPrice && secondPrice) {
        return `${firstPrice},${secondPrice}`
      }
      if (firstPrice) {
        return firstPrice
      }
      return null
    }

    return {
      price: price,
      oldPrice: getFullPrice(oldPrice, oldPriceRank),
      rating,
      reviews
    }
  })

  // Сохранение скриншота
  await page.screenshot({ path: 'screenshot.jpg', fullPage: true })

  // Сохранение данных в файл
  const dataToSave =
    `price=${productData.price || 'Нет данных'}\n` +
    `priceOld=${productData.oldPrice || 'Нет данных'}\n` +
    `rating=${productData.rating || 'Нет данных'}\n` +
    `reviewCount=${productData.reviews || 'Нет данных'}\n`

  fs.writeFileSync('product.txt', dataToSave)

  await browser.close()
})()
