// 示範資料：真實場地 + 虛構展覽，之後會由 scraping / 自助提交 / 用戶提交取代。
export type Category = "展覽" | "劇場" | "電影" | "音樂";

export interface LookEvent {
  slug: string;
  titleZh: string;
  titleEn: string;
  venueZh: string;
  venueEn: string;
  addressZh: string;
  category: Category;
  startDate: string; // ISO date
  endDate: string;
  priceZh: string;
  lat: number;
  lng: number;
  summaryZh: string;
  summaryEn: string;
  tags: string[];
  demo: boolean;
}

export const events: LookEvent[] = [
  {
    slug: "neon-city-archive",
    titleZh: "霓虹城市：光影檔案（示範）",
    titleEn: "Neon City: A Light Archive (Demo)",
    venueZh: "M+",
    venueEn: "M+",
    addressZh: "九龍西九文化區博物館道38號",
    category: "展覽",
    startDate: "2026-11-07",
    endDate: "2027-02-28",
    priceZh: "免費入場（standard 展區）；特展 $60",
    lat: 22.3039,
    lng: 114.1604,
    summaryZh:
      "以香港霓虹招牌為題的影像檔案展。展品包括攝影、手繪招牌設計圖，以及本地師傅的口述歷史錄音。展場最後一節設留言牆，邀請觀眾寫低自己同霓虹燈的記憶。（此為示範資料，非真實展覽）",
    summaryEn:
      "A visual archive exhibition on Hong Kong's neon signs: photography, hand-painted sign drafts, and oral-history recordings from local craftsmen. (Demo data, not a real exhibition.)",
    tags: ["攝影", "城市", "設計"],
    demo: true,
  },
  {
    slug: "ink-everyday",
    titleZh: "新界色彩：水墨與日常（示範）",
    titleEn: "Colours of the New Territories: Ink and the Everyday (Demo)",
    venueZh: "香港藝術館",
    venueEn: "Hong Kong Museum of Art",
    addressZh: "九龍尖沙咀梳士巴利道10號",
    category: "展覽",
    startDate: "2026-11-14",
    endDate: "2027-01-11",
    priceZh: "$10（standard 票）",
    lat: 22.2936,
    lng: 114.1713,
    summaryZh:
      "從館藏挑選二十世紀水墨作品，對照新界市鎮的生活物件。展覽用「山、水、墟、樓」四個章節鋪排，睇水墨如何記低日常。（此為示範資料，非真實展覽）",
    summaryEn:
      "Selected 20th-century ink works from the collection, juxtaposed with everyday objects from New Territories towns, in four chapters: mountain, water, market, housing. (Demo data.)",
    tags: ["水墨", "館藏"],
    demo: true,
  },
  {
    slug: "field-sculpture",
    titleZh: "場域：當代雕塑在地風景（示範）",
    titleEn: "Field: Contemporary Sculpture in Place (Demo)",
    venueZh: "大館 Contemplary Space",
    venueEn: "Tai Kwun Contemplary Space",
    addressZh: "香港中環荷李活道10號",
    category: "展覽",
    startDate: "2026-11-20",
    endDate: "2026-12-20",
    priceZh: "免費入場",
    lat: 22.2806,
    lng: 114.1583,
    summaryZh:
      "五位本地藝術家以監獄建築遺跡為背景創作場域特定雕塑。作品散落和大樓、洗衣場石階及院子，地圖會標示每件作品的位置。（此為示範資料，非真實展覽）",
    summaryEn:
      "Five Hong Kong artists make site-specific sculptures responding to the colonial prison architecture of Tai Kwun. (Demo data.)",
    tags: ["雕塑", "場域特定", "本地"],
    demo: true,
  },
  {
    slug: "listening-practice",
    titleZh: "聲音練習：一個社區的耳朵（示範）",
    titleEn: "Listening Practice: Ears of a Neighbourhood (Demo)",
    venueZh: "Para Site 藝術空間",
    venueEn: "Para Site Art Space",
    addressZh: "香港鰂魚涌海灣街22號地下",
    category: "展覽",
    startDate: "2026-11-28",
    endDate: "2027-01-17",
    priceZh: "免費入場",
    lat: 22.2868,
    lng: 114.2129,
    summaryZh:
      "以街道錄音為材料的聲音展覽：街市叫賣、交通燈、麻雀館同清早茶樓。觀眾可以喺展場借耳機，亦可以自己的錄音交給場方，經篩選後加入展覽。（此為示範資料，非真實展覽）",
    summaryEn:
      "A sound exhibition built from street recordings: market calls, traffic lights, mahjong parlours and morning teahouses. Visitors may contribute their own recordings after review. (Demo data.)",
    tags: ["聲音", "社區", "參與式"],
    demo: true,
  },
  {
    slug: "small-room-drawing",
    titleZh: "細房間大筆觸：畫廊新展（示範）",
    titleEn: "Small Room, Big Stroke: New in the Gallery (Demo)",
    venueZh: "中環 H Queen's 畫廊（示範場地）",
    venueEn: "H Queen's Gallery, Central (Demo)",
    addressZh: "香港中環皇后大道中80號",
    category: "展覽",
    startDate: "2026-11-03",
    endDate: "2026-12-05",
    priceZh: "免費入場（營業時間內）",
    lat: 22.2813,
    lng: 114.1584,
    summaryZh:
      "一位新晉畫家的近作，全部喺300呎以下嘅小房間度畫。畫布尺寸刻意集中喺一隻手臂範圍之內，睇大筆觸如何喺細空間生存。（此為示範資料，非真實展覽）",
    summaryEn:
      "Recent works by an emerging painter, all made in rooms under 300 sq ft; canvases are sized to one arm's reach. (Demo data.)",
    tags: ["繪畫", "新晉", "畫廊"],
    demo: true,
  },
];

export function getEvent(slug: string): LookEvent | undefined {
  return events.find((e) => e.slug === slug);
}

export function formatDateRange(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
  const s = new Date(startIso).toLocaleDateString("zh-HK", opts);
  const e = new Date(endIso).toLocaleDateString("zh-HK", opts);
  return s === e ? s : `${s} — ${e}`;
}
