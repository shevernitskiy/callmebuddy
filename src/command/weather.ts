import { Composer, DOMParser, Element, Menu } from "../../deps.ts";

import { BotContext } from "../bot.ts";

import mountains from "../data/mountains.json" assert { type: "json" };

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

const bot = new Composer<BotContext>();

const weather_menu = constructMenu();
bot.use(weather_menu);

bot.command("weather", (ctx) => {
  ctx.reply("Регионы", { reply_markup: weather_menu });
});

function constructMenu(): Menu<BotContext> {
  const weather_menu = new Menu<BotContext>("regions");
  const regions_menus: Menu<BotContext>[] = [];

  weather_menu.dynamic((ctx, range) => {
    if (ctx.session.last_weather === undefined) return;
    range.text(`${ctx.session.last_weather.name}, ${ctx.session.last_weather.alt}м`, async (ctx) => {
      ctx.deleteMessage();
      console.log(
        `Weather, id: ${ctx.from?.id}, mountain: ${ctx.session.last_weather?.key}, alt: ${ctx.session.last_weather?.alt}`,
      );
      const tmp = await ctx.reply("прогнозируем...");
      tmp.editText(
        `<code>${ctx.session.last_weather?.name} | el. ${ctx.session.last_weather?.alt}\n${await forecastForMountain(
          ctx.session.last_weather?.key!,
          ctx.session.last_weather?.alt!,
        )}</code>`,
        {
          parse_mode: "HTML",
        },
      );
    }).row();
  });

  let i = 0;
  for (const [key_region, region] of Object.entries(mountains)) {
    const region_menu = new Menu<BotContext>(`region_${key_region}`);
    const mountain_menus: Menu<BotContext>[] = [];

    let k = 0;
    for (const [key_mountain, mountain] of Object.entries(region.value)) {
      const mountain_menu = new Menu<BotContext>(`mountain_${key_mountain}`);

      for (const [index, alt] of mountain.value.entries()) {
        mountain_menu
          .text(`${alt}м`, async (ctx) => {
            try {
              ctx.deleteMessage();
              console.log(`Weather, id: ${ctx.from?.id}, mountain: ${key_mountain}, alt: ${alt}`);
              const tmp = await ctx.reply("прогнозируем...");
              await ctx.reply(
                `<code>${mountain.name} | el. ${alt}\n${await forecastForMountain(key_mountain, alt)}</code>`,
                {
                  parse_mode: "HTML",
                },
              ).finally(() => tmp.delete());
              ctx.session.last_weather = {
                key: key_mountain,
                name: mountain.name,
                alt: alt,
              };
            } catch (err) {
              console.error(err);
              ctx.reply("ошибка...");
            }
          });

        if (index % 2 !== 0 && index !== 0) {
          mountain_menu.row();
        }
      }

      addNav(mountain_menu);
      mountain_menus.push(mountain_menu);
      region_menu.submenu(
        mountain.name,
        `mountain_${key_mountain}`,
        (ctx) => ctx.editMessageText(`Высоты горы ${mountain.name}`),
      );
      if (k % 2 !== 0 && k !== 0) {
        region_menu.row();
      }
      k++;
    }

    addNav(region_menu);
    region_menu.register(mountain_menus);
    regions_menus.push(region_menu);
    weather_menu.submenu(
      region.name,
      `region_${key_region}`,
      (ctx) => ctx.editMessageText(`Горы региона ${region.name}`),
    );
    if (i % 2 !== 0 && i !== 0) {
      weather_menu.row();
    }
    i++;
  }

  weather_menu.row();
  weather_menu.text("🚫 закрыть", (ctx) => ctx.deleteMessage());
  weather_menu.register(regions_menus);

  return weather_menu;
}

function addNav(menu: Menu<BotContext>): Menu<BotContext> {
  return menu
    .row()
    .back("⬅️ назад", (ctx) => ctx.editMessageText(`Регионы`))
    .back("🚫 закрыть", async (ctx) => {
      await ctx.menu.close({ immediate: true });
      ctx.deleteMessage();
    });
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
  const summary = dom.querySelectorAll(
    "tr.forecast-table__row span.forecast-table__phrase",
  );

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
