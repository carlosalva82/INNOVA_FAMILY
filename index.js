import dotenv from "dotenv";
import puppeteer from "puppeteer";
import { Client } from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';


(async () => {
    dotenv.config();
    console.time("tiempo total");
    async function sendMessageTo(message) {
        for (let index = 0; index < process.env.PHONES_TO_SEND; index++) {
            await client.sendMessage(`${array[index]}1@c.us`, message);
        }
    }

    async function extractUnreadTodayEmail() {
        // Lanzamos un nuevo navegador.
        const browser = await puppeteer.launch({
            headless: true,
            userDataDir: './my_profile_carlos',
            defaultViewport: null,
            args: [
                '--start-fullscreen',
            ]
        });
        // Abrimos una nueva página.
        const page = await browser.newPage();
        // Vamos a la URL.
        console.log("voy a la pagina");
        await page.goto('https://innovafamily.pe/Bandeja/Index', { waitUntil: 'networkidle2', timeout: 60000 });

        // Obtiene la URL de la página actual
        const url = await page.url();

        if (url.includes('Login')) {
            console.log('Estás en la página de autenticación');

            await page.click("#IngresarUsuario");
            await page.type("#Correo", process.env.INNOVA_FAMILY_EMAIL);
            await page.type("#Password", process.env.INNOVA_FAMILY_USERNAME);
            await Promise.all([
                page.click('#btn_inicio_sesion'),
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ]);
        }
        const urlAuthenticated = await page.url();
        if (urlAuthenticated.includes('Bandeja')) {
            page.on('console', msg => console.log('Mensaje del navegador:', msg.text()));
            //click sobre Docente/Tutor
            await page.click("button[data-categoria=\"'DC'\"]");
            //itero entre todos los elementos de un div loadData

            const div = await page.$('#loadData');
            const children = await div.$$(':scope > *');
            let countPtags = 0;

            for (let child of children) {
                const tagName = await page.evaluate(el => el.tagName, child);
                console.log(tagName);
                let pText = await page.evaluate(el => el.textContent, child);
                console.log('includes hoy', pText.includes('Hoy'));
                if (tagName === 'P') {
                    countPtags++;
                    if (countPtags == 1 && !pText.includes('Hoy')) break;
                }
                if (countPtags > 1) break;
                if (tagName === 'DIV') {
                    const firstElementChild = await child.$(':scope > *');
                    const className = await page.evaluate(element => element.className, firstElementChild);
                    if (!className.includes('unread')) continue;
                    await firstElementChild.click();
                    await page.waitForSelector('.info_mensaje');
                    // await page.screenshot({ path: 'screenshot.png', fullPage: true });
                    const userName = await page.$('.nombre_usuario');
                    const userNameContent = await page.evaluate(element => element.textContent, userName);

                    const message = await page.$('.cuerpo_mensaje');
                    const messageContent = await page.evaluate(element => element.textContent, message);

                    const userSign = await page.$('.firma_usuario');
                    const userSignContent = await page.evaluate(element => element.textContent, userSign);
                    // Extrae el contenido del div con clase grado_seccion
                    const gradoSeccionElement = await firstElementChild.$('.grado_seccion');
                    if (gradoSeccionElement) {
                        const gradoSeccionContent = await page.evaluate(element => element.textContent, gradoSeccionElement);
                        await sendMessageTo(`*GRADO: ${gradoSeccionContent}*`);
                    }
                    await sendMessageTo(`
                    Remitente: ${userNameContent}\n
                    *${messageContent}*
                `)
                }
            }
        }
        // Cerramos la página y el navegador.
        await page.close();
        await browser.close();
        console.timeEnd("tiempo total");
    }


    const client = new Client({
        puppeteer: { headless: true, userDataDir: './ws_session', },
    });


    client.on('qr', qr => {
        // Genera y escanea este código con tu teléfono
        console.log('QR RECIBIDO', qr);
        qrcodeTerminal.generate(qr, { small: true });
    });

    client.on('ready', async () => {
        console.log('¡El cliente está listo!');
        await extractUnreadTodayEmail();
        // client.sendMessage('51940401888@c.us', 'mensaje de prueba');
    });

    client.on('authenticated', async (session) => {
        console.log('Autenticado');
    });

    client.initialize();

})();
