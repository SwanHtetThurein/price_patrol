import axios from 'axios';
import * as cheerio from 'cheerio'; 
import { extractOriginalPrice, extractCurrency, extractCurrentPrice, extractDescription } from '../utils';
import { scrapeAndStoreProduct } from '@/lib/actions';

export async function scrapeAmazonProduct(url: string) {
    if(!url) return;

    // curl --proxy brd.superproxy.io:22225 --proxy-user brd-customer-hl_b7b5cd07-zone-price_patrol:q3euj8a60v80 -k "https://geo.brdtest.com/welcome.txt"

    //Configure BrithData proxy
    const username = String(process.env.BRIGHT_DATA_USERNAME);
    const password = String(process.env.BRIGHT_DATA_PASSWORD);
    const port = 22225;
    const session_id = (1000000 * Math.random()) | 0;

    const options = {
        auth: {
            username: `${username}-session-${session_id}`,
            password,
        },
        host: 'brd.superproxy.io',
        port, 
        rejectUnauthorized: false,
    }

    try {
        const response = await axios.get(url,options)
        const $ = cheerio.load(response.data);

        const title = $('#productTitle').text().trim();

        // const currentPrice = extractPrice(
        // $('.priceToPay span.a-price-whole'),
        // $('.a.size.base.a-color-price'),
        // $('.a-button-selected .a-color-base'),
        // );
        const currentPrice = extractCurrentPrice(
            [
                $('.priceToPay span.a-price-whole').first(),
                $('.a.size.base.a-color-price'),
                $('.a-button-selected .a-color-base'),
            ],
            $('.priceToPay span.a-price-fraction')
        );

        const originalPrice = extractOriginalPrice(
        $('#priceblock_ourprice'),
        // $('.a-price.a-text-price span.a-offscreen'),
        $('span[data-a-strike=true] span.a-offscreen').first(),
        $('#listPrice'),
        $('#priceblock_dealprice'),
        $('.a-size-base.a-color-price')
        );

        const outOfStock = $('#availability span').text().trim().toLowerCase() === 'currently unavailable';

        const images = 
        $('#imgBlkFront').attr('data-a-dynamic-image') || 
        $('#landingImage').attr('data-a-dynamic-image') || '{}';
    
        const imageUrls = Object.keys(JSON.parse(images));

        const currency = extractCurrency($('.a-price-symbol'));

        const discountRate = $('.savingsPercentage').first().text().replace(/[-%]/g, "");
        
        const description = extractDescription($);
        const data = {
            url,
            currency: currency || '$',
            image: imageUrls[0],
            title,
            currentPrice: Number(currentPrice) || Number(originalPrice),
            originalPrice: Number(originalPrice) || Number(currentPrice),
            priceHistory: [],
            discountRate: Number(discountRate),
            category: 'category',
            isOutofStock: outOfStock,
            description,
            lowestPrice: Number(currentPrice) || Number(originalPrice),
            highestPrice: Number(originalPrice) || Number(currentPrice),
            average: Number(currentPrice) || Number(originalPrice),
        }

        return data;
    } catch (error: any) {
        throw new Error('Failed to scrape produce: ${error.message}')
    }
}