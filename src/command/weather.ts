import { Composer, DOMParser, Element, HTMLDocument, Menu } from "../../deps.ts";

import mountains from "../data/mountains.json" assert { type: "json" };

const bot = new Composer();
export { bot as CommandWeather };

const weather_menu = constructMenu();
bot.use(weather_menu);

bot.command("weather", (ctx) => {
  ctx.reply("Регионы", { reply_markup: weather_menu });
});

function constructMenu(): Menu {
  const weather_menu = new Menu("regions");
  const regions_menus: Menu[] = [];

  for (const [key_region, region] of Object.entries(mountains)) {
    const region_menu = new Menu(`region_${key_region}`);
    const mountain_menus: Menu[] = [];

    for (const [key_mountain, mountain] of Object.entries(region.value)) {
      const mountain_menu = new Menu(`mountain_${key_mountain}`);

      for (const alt of mountain.value) {
        mountain_menu
          .text(`${alt}м`, async (ctx) => {
            ctx.deleteMessage();
            console.log(`Weather, id: ${ctx.msg!.from?.id}, mountain: ${key_mountain}, alt: ${alt}`);
            const tmp = await ctx.reply("прогнозируем...");
            const html = await fetchMountain(key_mountain, alt);
            const post = parseHtmlToMessage(html);
            ctx.reply(`${mountain.name} | el. ${alt}\n${post}`, { parse_mode: "HTML" }).finally(() =>
              ctx.api.deleteMessage(ctx.from?.id!, tmp.message_id)
            );
          })
          .row();
      }

      mountain_menus.push(mountain_menu);
      region_menu.submenu(mountain.name, `mountain_${key_mountain}`, (ctx) => ctx.editMessageText(`Высоты горы ${mountain.name}`)).row();
    }

    region_menu.register(mountain_menus);
    regions_menus.push(region_menu);
    weather_menu.submenu(region.name, `region_${key_region}`, (ctx) => ctx.editMessageText(`Горы региона ${region.name}`)).row();
  }
  weather_menu.register(regions_menus);

  return weather_menu;
}

async function fetchMountain(mountain: string, alt: number): Promise<string> {
  const res = await fetch(`https://www.mountain-forecast.com/peaks/${mountain}/forecasts/data?elev=all&period_types=p,t,h`);
  return (await res.json()).elevations[alt].period_types.t.table as string;
}

function parseHtmlToMessage(html: string): string {
  // deno-lint-ignore no-explicit-any
  const obj: any = [];
  const msg: string[] = [];

  const dom = new DOMParser().parseFromString(html, "text/html") as HTMLDocument;

  for (let i = 0; i < domLength(dom, "tr.forecast__table-time td.forecast__table-time-item") - 1; i++) {
    obj.push({ time: domItemText(dom, "tr.forecast__table-time span.forecast__table-value", i) });
  }
  for (let i = 0; i < domLength(dom, "tr.forecast__table-max-temperature span.temp") - 1; i++) {
    obj[i].temp = domItemText(dom, "tr.forecast__table-max-temperature span.temp", i);
  }
  for (let i = 0; i < domLength(dom, "tr.forecast__table-wind div.wind-icon__tooltip") - 1; i++) {
    obj[i].wind_dir = domItemText(dom, "tr.forecast__table-wind div.wind-icon__tooltip", i);
  }
  for (let i = 0; i < domLength(dom, "tr.forecast__table-wind text") - 1; i++) {
    obj[i].wind_speed = domItemText(dom, "tr.forecast__table-wind text", i);
  }
  for (let i = 0; i < domLength(dom, "tr.forecast__table-snow span.snow") - 1; i++) {
    obj[i].mm = domItemText(dom, "tr.forecast__table-snow span.snow", i).split("-").join("0");
  }
  for (let i = 0; i < domLength(dom, "tr.forecast__table-rain span.rain") - 1; i++) {
    if (parseInt(domItemText(dom, "tr.forecast__table-rain span.rain", i)) > parseInt(obj[i].mm.replaceAll("-", 0))) {
      obj[i].mm = domItemText(dom, "tr.forecast__table-rain span.rain", i).split("-").join("0");
    }
  }
  for (let i = 0; i < domLength(dom, "tr.forecast__table-summary td") - 1; i++) {
    obj[i].summary = domItemText(dom, "tr.forecast__table-summary td", i);
  }
  let target = 0;
  for (let i = 0; i < domLength(dom, "td.forecast__table-days-item") - 1; i++) {
    msg.push("------------------------------");
    msg.push(domItemText(dom, "td.forecast__table-days-item", i).split("\n").join(" ").replace("                  ", " "));
    for (let k = 0; k < parseInt(domItemAttr(dom, "td.forecast__table-days-item", i, "colspan")); k++) {
      msg.push(
        `${`0${obj[target].time}`.substr(-5).replace(" ", "").replace("AM", "am").replace("PM", "pm")}|${
          `${obj[target].temp}°C`.padEnd(
            5,
            " ",
          )
        }|${`${obj[target].wind_speed} ${obj[target].wind_dir}`.padEnd(6, " ")}|${
          `${obj[target].mm}mm`
            .padEnd(4, " ")
            .replace("-", "0")
        }|${
          `${obj[target].summary}`
            .replace("shwrs", "shwr")
            .replace("some", "")
            .replace("light", "lt")
            .replace("heavy", "hvy")
            .replace("storm", "stm")
            .trim()
        }`,
      );
      target++;
    }
  }
  return `<code>${msg.join("\n")}</code>`;
}

function domLength(dom: HTMLDocument, selector: string): number {
  return dom.querySelectorAll(selector).length;
}

function domItemText(dom: HTMLDocument, selector: string, item: number): string {
  return dom.querySelectorAll(selector).item(item).textContent.trim();
}

function domItemAttr(dom: HTMLDocument, selector: string, item: number, attr: string): string {
  return (dom.querySelectorAll(selector).item(item) as Element).getAttribute(attr) as string;
}
