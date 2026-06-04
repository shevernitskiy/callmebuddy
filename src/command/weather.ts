import { Composer } from "@grammyjs/grammy";
import { DOMParser, Element } from "@b-fuze/deno-dom";

import { BotContext } from "../bot.ts";
import { getState, findUserState, getUserState } from "../state.ts";

import mountains from "../data/mountains.json" with { type: "json" };

type WeatherData = {
  day: string;
  time: string;
  temp: number;
  wind_dir: string;
  wind_speed: number;
  snow: number;
  rain: number;
  summary: string;
};

type InlineKeyboard = {
  inline_keyboard: InlineKeyboardButton[][];
};

type InlineKeyboardButton = {
  text: string;
  callback_data: string;
};

const bot = new Composer<BotContext>();

bot.command("weather", async (ctx) => {
  await ctx.sendMessage("Регионы", { reply_markup: await regionsKeyboard(ctx) });
});

bot.callbackQuery("weather:regions", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Регионы", { reply_markup: await regionsKeyboard(ctx) });
});

bot.callbackQuery("weather:close", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();
});

// Клик по сохраненной горе (стейт не трогаем вообще)
bot.callbackQuery(/^weather:last:([^:]+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const key_mountain = decodeKey(ctx.match[1]);
  const alt = Number(ctx.match[2]);
  const mountain = findMountain(key_mountain);

  if (mountain === undefined) {
    await ctx.sendMessage("Гора не найдена");
    return;
  }

  // false означает, что нам не нужно перезаписывать state
  await sendForecast(ctx, key_mountain, mountain.name, alt, false);
});

bot.callbackQuery(/^weather:region:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const key_region = decodeKey(ctx.match[1]);
  const region = mountains[key_region as keyof typeof mountains];

  if (region === undefined) {
    await ctx.sendMessage("Регион не найден");
    return;
  }

  await ctx.editMessageText(`Горы региона ${region.name}`, { reply_markup: mountainsKeyboard(key_region) });
});

bot.callbackQuery(/^weather:mountain:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const key_mountain = decodeKey(ctx.match[1]);
  const mountain = findMountain(key_mountain);

  if (mountain === undefined) {
    await ctx.sendMessage("Гора не найдена");
    return;
  }

  await ctx.editMessageText(`Высоты горы ${mountain.name}`, {
    reply_markup: altsKeyboard(key_mountain, mountain.value),
  });
});

// Клик по новой горе из меню (обновляем стейт)
bot.callbackQuery(/^weather:forecast:([^:]+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const key_mountain = decodeKey(ctx.match[1]);
  const alt = Number(ctx.match[2]);
  const mountain = findMountain(key_mountain);

  if (mountain === undefined) {
    await ctx.sendMessage("Гора не найдена");
    return;
  }

  // true означает, что нужно обновить last_weather в state
  await sendForecast(ctx, key_mountain, mountain.name, alt, true);
});

async function regionsKeyboard(ctx: BotContext): Promise<InlineKeyboard> {
  const keyboard = createKeyboard();

  // Здесь мы читаем стейт 1 раз при построении меню
  await using state = await getState();
  const last_weather = findUserState(state, ctx.from?.id)?.last_weather;

  if (last_weather !== undefined) {
    // Зашиваем данные прямо в кнопку, чтобы не читать стейт при клике
    addButton(
      keyboard,
      `♻️ ${last_weather.name}, ${last_weather.alt}м`,
      `weather:last:${encodeKey(last_weather.key)}:${last_weather.alt}`,
    );
    addRow(keyboard);
  }

  let i = 0;
  for (const [key_region, region] of Object.entries(mountains)) {
    addButton(keyboard, region.name, `weather:region:${encodeKey(key_region)}`);
    if (i % 2 !== 0) addRow(keyboard);
    i++;
  }

  addRow(keyboard);
  addButton(keyboard, "🚫 закрыть", "weather:close");
  return keyboard;
}

function mountainsKeyboard(key_region: string): InlineKeyboard {
  const keyboard = createKeyboard();
  const region = mountains[key_region as keyof typeof mountains];
  if (region === undefined) return navKeyboard();

  let i = 0;
  for (const [key_mountain, mountain] of Object.entries(region.value)) {
    addButton(keyboard, mountain.name, `weather:mountain:${encodeKey(key_mountain)}`);
    if (i % 2 !== 0) addRow(keyboard);
    i++;
  }

  return addNav(keyboard);
}

function altsKeyboard(key_mountain: string, alts: number[]): InlineKeyboard {
  const keyboard = createKeyboard();

  for (const [index, alt] of alts.entries()) {
    addButton(keyboard, `${alt}м`, `weather:forecast:${encodeKey(key_mountain)}:${alt}`);
    if (index % 2 !== 0) addRow(keyboard);
  }

  return addNav(keyboard);
}

function addNav(keyboard: InlineKeyboard): InlineKeyboard {
  addRow(keyboard);
  addButton(keyboard, "⬅️ назад", "weather:regions");
  addButton(keyboard, "🚫 закрыть", "weather:close");
  return keyboard;
}

function navKeyboard(): InlineKeyboard {
  return addNav(createKeyboard());
}

async function sendForecast(
  ctx: BotContext,
  key: string,
  name: string,
  alt: number,
  updateState: boolean,
): Promise<void> {
  try {
    await ctx.deleteMessage(); // Удаляем клавиатуру
    console.log(`Weather, id: ${ctx.from?.id}, mountain: ${key}, alt: ${alt}`);

    const tmp = await ctx.sendMessage("прогнозируем...");

    try {
      const forecastData = await forecastForMountain(key, alt);
      await ctx.sendMessage(`<code>${name} | el. ${alt}\n${forecastData}</code>`, {
        parse_mode: "HTML",
      });
    } finally {
      // Гарантированно удаляем сообщение "прогнозируем..."
      await ctx.api.deleteMessage(tmp.chat.id, tmp.message_id).catch(() => {});
    }

    if (updateState) {
      await using state = await getState();
      const user_state = getUserState(state, ctx.from?.id);

      // Защита от холостой перезаписи (экономит Write operation)
      const isSame = user_state?.last_weather?.key === key && user_state?.last_weather?.alt === alt;

      if (user_state !== undefined && !isSame) {
        user_state.last_weather = { key, name, alt };
      }
    }
  } catch (err) {
    console.error(err);
    await ctx.sendMessage("ошибка...");
  }
}

function createKeyboard(): InlineKeyboard {
  return { inline_keyboard: [[]] };
}

function addButton(keyboard: InlineKeyboard, text: string, callback_data: string): void {
  keyboard.inline_keyboard.at(-1)?.push({ text, callback_data });
}

function addRow(keyboard: InlineKeyboard): void {
  if (keyboard.inline_keyboard.at(-1)?.length === 0) return;
  keyboard.inline_keyboard.push([]);
}

function findMountain(key_mountain: string): { name: string; value: number[] } | undefined {
  for (const region of Object.values(mountains)) {
    const mountain = region.value[key_mountain as keyof typeof region.value];
    if (mountain !== undefined) return mountain;
  }
}

function encodeKey(key: string): string {
  return encodeURIComponent(key);
}

function decodeKey(key: string): string {
  return decodeURIComponent(key);
}

async function forecastForMountain(mountain: string, alt: number): Promise<string> {
  try {
    const html = await fetchMountainHtml(mountain, alt);
    const data = parseHtml(html);
    const message = formMessage(data);
    return message;
  } catch (err) {
    console.error(err);
    return "что-то пошло не так:(";
  }
}

async function fetchMountainHtml(mountain: string, alt: number): Promise<string> {
  const res = await fetch(
    `https://www.mountain-forecast.com/peaks/${mountain}/forecasts/data?elev=${alt}&period_types=t,h`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );
  return (await res.json()).elevations[alt].period_types.t.table as string;
}

function parseHtml(html: string): WeatherData[] {
  const dom = new DOMParser().parseFromString(html, "text/html")!;

  const out: WeatherData[] = [];

  const days = dom.querySelectorAll("td.forecast-table-days__cell");
  const time = dom.querySelectorAll("tr.forecast-table__row div.forecast-table__time span");
  const temp = dom.querySelectorAll("tr.forecast-table__row div.forecast-table__container--max");
  const wind_dir = dom.querySelectorAll(
    "tr.forecast-table__row div.forecast-table__container--wind div.wind-icon__tooltip",
  );
  const wind_speed = dom.querySelectorAll("tr.forecast-table__row div.forecast-table__container--wind text");
  const snow = dom.querySelectorAll("tr.forecast-table__row div.snow-amount span");
  const rain = dom.querySelectorAll("tr.forecast-table__row div.rain-amount span");
  const summary = dom.querySelectorAll("tr.forecast-table__row span.forecast-table__phrase");

  for (let i = 0; i < time.length; i++) {
    const snow_temp = Number(snow.item(i)?.textContent.trim());
    const rain_temp = Number(rain.item(i)?.textContent.trim());
    out.push({
      day: "",
      time: time.item(i)?.textContent.trim().replace(" AM", "am").replace(" PM", "pm"),
      temp: Number(temp.item(i)?.textContent.trim()),
      wind_dir: wind_dir.item(i)?.textContent.trim(),
      wind_speed: Number(wind_speed.item(i)?.textContent.trim()),
      snow: isNaN(snow_temp) ? 0 : snow_temp,
      rain: isNaN(rain_temp) ? 0 : rain_temp,
      summary: summary.item(i)?.textContent.trim(),
    });
  }

  let k = 0;
  for (let i = 0; i < days.length; i++) {
    const day = days.item(i);
    for (let j = 0; j < Number((day as Element).getAttribute("colspan")); j++) {
      out[k].day = (day as Element).getAttribute("data-value")!.replaceAll("_", " ");
      k++;
    }
  }

  return out;
}

function formMessage(data: WeatherData[]): string {
  const msg: string[] = [];
  let day = "";

  for (const item of data) {
    if (day !== item.day) {
      day = item.day;
      msg.push("------------------------------", item.day);
    }
    let str = item.time.padStart(4, "0") + "|";
    str += ((item.temp > 0 ? "+" : "") + (item.temp === 0 ? " " : "") + item.temp).padEnd(3, " ") + "°C|";
    str += item.wind_speed.toString().padEnd(3, " ") + item.wind_dir.padEnd(3, " ") + "|";
    str += (item.snow > item.rain ? item.snow : item.rain).toString().padEnd(2, " ") + "mm|";
    str += summaryMinify(item.summary);
    msg.push(str);
  }

  return msg.join("\n");
}

function summaryMinify(value: string): string {
  return value
    .replace("shwrs", "shwr")
    .replace("some", "")
    .replace("light", "lt")
    .replace("heavy", "hvy")
    .replace("storm", "stm")
    .trim();
}

export { bot as CommandWeather };
