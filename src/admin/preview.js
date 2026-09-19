/* Named & Seen — live preview and colour picker for the admin.
   The preview renders the same blocks as the real site, with the site's
   stylesheet, so what you see on the right is what the page will look like. */
(function () {
  var CMS = window.CMS;
  var h = window.h;
  var createClass = window.createClass;

  CMS.registerPreviewStyle("/assets/site.css");

  /* ---------- data from the published site (products, settings) ---------- */
  var SITE = { settings: {}, fonts: {}, products: [] };
  var ready = fetch("/admin/data.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : SITE; })
    .then(function (d) { SITE = d || SITE; })
    .catch(function () {});

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function accent(s) {
    return esc(s).replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/\n/g, "<br>");
  }
  function md(s) {
    // small markdown: paragraphs, ## headings, **bold**, *italic*, [link](url), - lists
    var out = [], list = null;
    String(s || "").split(/\n/).forEach(function (line) {
      var t = line.trim();
      if (/^[-*] /.test(t)) { if (!list) { list = []; } list.push(inline(t.slice(2))); return; }
      if (list) { out.push("<ul>" + list.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>"); list = null; }
      if (!t) return;
      if (/^### /.test(t)) out.push("<h3>" + inline(t.slice(4)) + "</h3>");
      else if (/^## /.test(t)) out.push("<h2>" + inline(t.slice(3)) + "</h2>");
      else out.push("<p>" + inline(t) + "</p>");
    });
    if (list) out.push("<ul>" + list.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>");
    return out.join("");
    function inline(x) {
      return esc(x)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    }
  }
  function fill(s) {
    var st = SITE.settings || {};
    return String(s || "").replace(/\{\{\s*settings\.(\w+)\s*\}\}/g, function (m, k) { return st[k] || ""; });
  }
  function euro(n) {
    if (n === "" || n == null) return "";
    var v = Number(n);
    return "€" + (Number.isInteger(v) ? v : v.toFixed(2).replace(".", ","));
  }
  function ratio(r) { return r && r !== "default" && r !== "original" ? ' style="--ratio:' + r + '"' : ""; }
  function ratioClass(r) { return r === "original" ? " original" : ""; }
  function head(b, center) {
    return '<div class="head' + (center ? " center" : "") + '">' +
      (b.eyebrow ? '<div class="label">' + esc(b.eyebrow) + "</div>" : "") +
      (b.title ? '<h2 class="display">' + accent(b.title) + "</h2>" : "") +
      (b.text ? "<p>" + esc(b.text) + "</p>" : "") + "</div>";
  }
  function sec(b, inner) { return "<section" + (b.anchor ? ' id="' + esc(b.anchor) + '"' : "") + '><div class="wrap">' + inner + "</div></section>"; }
  function buy(p) {
    if (p.status === "available") return '<a class="btn solid">Buy now</a>';
    return '<a class="btn ghost">Coming soon · tell me</a>';
  }
  function demo(p) { return p.demo_url ? '<a class="btn ghost">View demo</a>' : '<span class="btn ghost" aria-disabled="true">Demo soon</span>'; }

  /* ---------- blocks (same markup as src/_includes/blocks) ---------- */
  var B = {};
  B.hero = function (b, img) {
    return '<div class="wrap hero"><div class="hero-grid"><div>' +
      (b.eyebrow ? '<div class="label">' + esc(b.eyebrow) + "</div>" : "") +
      '<h1 class="display">' + accent(b.title) + "</h1>" +
      (b.text ? '<p class="lede">' + esc(b.text) + "</p>" : "") +
      '<div class="acts">' +
      (b.button_label ? '<a class="btn solid">' + esc(b.button_label) + "</a>" : "") +
      (b.button2_label ? '<a class="btn ghost">' + esc(b.button2_label) + "</a>" : "") +
      "</div></div>" +
      (b.image ? '<div class="frame hero-frame' + ratioClass(b.ratio) + '"' + ratio(b.ratio) + '><img src="' + img(b.image) + '"></div>' : "") +
      "</div></div>";
  };
  B.page_head = function (b) {
    return '<div class="wrap page-head' + (b.center ? " align-center" : "") + '">' +
      (b.eyebrow ? '<div class="label">' + esc(b.eyebrow) + "</div>" : "") +
      '<h1 class="display">' + accent(b.title) + "</h1>" + (b.text ? "<p>" + esc(b.text) + "</p>" : "") + "</div>";
  };
  B.trust = function (b) {
    return '<div class="wrap"><div class="trust">' + (b.items || []).map(function (i) {
      return '<div><div class="n">' + esc(i.number) + '</div><div class="t">' + esc(i.text) + "</div></div>";
    }).join("") + "</div></div>";
  };
  B.collections = function (b, img) {
    var av = SITE.products.filter(function (p) { return p.status === "available"; });
    return sec(b, head(b, true) + '<div class="collections">' + av.map(function (p) {
      return '<a class="coll"><div class="frame' + ratioClass(b.ratio) + '"' + ratio(b.ratio) + '><img src="' + img(p.cover) + '"></div>' +
        '<div class="meta"><h3>' + esc(p.collection) + '</h3><span class="state on">Available</span></div>' +
        '<div class="meta"><p>' + esc(p.tagline) + '</p><div class="swatches">' +
        (p.swatches || []).map(function (c) { return '<i style="background:' + esc(c) + '"></i>'; }).join("") + "</div></div></a>";
    }).join("") + "</div>");
  };
  B.templates = function (b, img) {
    var P = SITE.products;
    var f = P.filter(function (p) { return p.featured; })[0];
    var others = P.filter(function (p) { return p.status === "available" && !p.featured; });
    var soon = P.filter(function (p) { return p.status === "soon"; });
    var html = head(b);
    if (f) {
      html += '<div class="feature"><div class="visual"><img src="' + img(f.cover) + '"></div><div class="info">' +
        '<div class="label">' + esc(f.collection) + " · " + esc(f.format) + "</div><h3>" + esc(f.title) + "</h3>" +
        '<p class="desc">' + esc(f.summary) + "</p>" +
        ((f.includes || []).length ? '<ul class="incl-list">' + f.includes.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" : "") +
        '<div class="pricing"><span class="now">' + euro(f.price) + '</span></div><div class="acts">' + buy(f) + demo(f) + "</div></div></div>";
    }
    if (others.length) {
      html += '<div class="duo">' + others.map(function (p) {
        return '<article class="prod"><a class="frame' + ratioClass(b.ratio_cards) + '"' + ratio(b.ratio_cards) + '><img src="' + img(p.cover) + '"></a><div class="prod-body">' +
          '<div class="label">' + esc(p.collection) + " · " + esc(p.format) + "</div><h3>" + esc(p.title) + "</h3><p>" + esc(p.summary) + "</p>" +
          '<div class="pricing"><span class="now">' + euro(p.price) + '</span></div><div class="acts">' + buy(p) + demo(p) + "</div></div></article>";
      }).join("") + "</div>";
    }
    if (soon.length) {
      html += '<div class="upcoming-head"><h3>' + esc(b.soon_title || "Opening next") + '</h3><span class="label">' + esc(b.soon_eyebrow) + "</span></div>" +
        '<div class="products three">' + soon.map(function (p) {
          return '<article class="card"><div class="frame' + ratioClass(b.ratio_soon) + '"' + ratio(b.ratio_soon) + '><img src="' + img(p.cover) + '"></div>' +
            '<span class="kind">' + esc(p.collection) + " · " + esc(p.format) + "</span><h4>" + esc(p.title) + '</h4><span class="price">' + esc(p.tagline) + "</span></article>";
        }).join("") + "</div>";
    }
    if (!P.length) html += '<p class="label">Тут з\'являться шаблони з розділу «Шаблони»</p>';
    return sec(b, html);
  };
  B.extras = function (b) {
    return '<div class="wrap" style="padding-bottom:60px"><div class="pair">' + (b.items || []).map(function (i) {
      return '<div class="mini' + (i.highlight ? " suite" : "") + '"><div class="label">' + esc(i.eyebrow) + "</div><h3>" + esc(i.title) + "</h3><p>" + esc(i.text) + "</p>" +
        '<div class="pricing"><span class="now">' + euro(i.price) + "</span></div>" +
        (i.status === "available" ? '<a class="btn solid">Buy now</a>' : '<a class="btn ghost">Coming soon · tell me →</a>') + "</div>";
    }).join("") + "</div></div>";
  };
  B.comparison = function (b) {
    return sec(b, head(b) + '<div class="cmp-wrap"><table class="cmp"><thead><tr><th></th><th class="us">' + esc(b.col_us) + "</th><th>" + esc(b.col_a) + "</th><th>" + esc(b.col_b) + "</th></tr></thead><tbody>" +
      (b.rows || []).map(function (r) { return "<tr><td>" + esc(r.label) + '</td><td class="us">' + esc(r.us) + "</td><td>" + esc(r.a) + "</td><td>" + esc(r.b) + "</td></tr>"; }).join("") +
      "</tbody></table></div>");
  };
  B.steps = function (b) {
    return sec(b, head(b) + '<div class="steps">' + (b.steps || []).map(function (s, i) {
      return '<div class="step"><span class="n">Step ' + (i < 9 ? "0" : "") + (i + 1) + "</span><h3>" + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></div>";
    }).join("") + "</div>");
  };
  B.inside = function (b) {
    return sec(b, '<div class="included-wrap">' + (b.eyebrow ? '<div class="label">' + esc(b.eyebrow) + "</div>" : "") +
      '<h2 class="display">' + accent(b.title) + "</h2>" + (b.text ? "<p>" + esc(b.text) + "</p>" : "") +
      '<ul class="included">' + (b.items || []).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div>");
  };
  B.band = function (b) {
    return '<div class="band"><div class="wrap">' + (b.eyebrow ? '<div class="label">' + esc(b.eyebrow) + "</div>" : "") +
      '<h2 class="display">' + accent(b.title) + "</h2>" + (b.text ? "<p>" + esc(b.text) + "</p>" : "") +
      (b.button_label ? '<a class="btn">' + esc(b.button_label) + "</a>" : "") + "</div></div>";
  };
  B.text = function (b) {
    return sec(b, head(b, b.center) + (b.body ? '<div class="prose' + (b.center ? " align-center" : "") + '">' + md(fill(b.body)) + "</div>" : ""));
  };
  B.image = function (b, img) {
    return sec(b, (b.title ? head(b) : "") + '<figure class="img-block' + (b.full ? " full" : "") + (b.center ? " align-center" : "") + '">' +
      '<div class="frame' + ratioClass(b.ratio) + '"' + ratio(b.ratio) + ">" + (b.image ? '<img src="' + img(b.image) + '">' : "") + "</div>" +
      (b.caption ? "<figcaption>" + esc(b.caption) + "</figcaption>" : "") + "</figure>");
  };
  B.split = function (b, img) {
    return sec(b, '<div class="split' + (b.flip ? " flip" : "") + '"><div class="frame' + ratioClass(b.ratio) + '"' + ratio(b.ratio) + ">" +
      (b.image ? '<img src="' + img(b.image) + '">' : "") + "</div><div>" +
      (b.eyebrow ? '<div class="label">' + esc(b.eyebrow) + "</div>" : "") +
      (b.title ? '<h2 class="display" style="font-size:clamp(28px,4vw,44px);margin:14px 0 16px">' + accent(b.title) + "</h2>" : "") +
      (b.body ? '<div class="prose">' + md(fill(b.body)) + "</div>" : "") +
      (b.button_label ? '<p style="margin-top:24px"><a class="btn solid">' + esc(b.button_label) + "</a></p>" : "") + "</div></div>");
  };
  B.reviews = function (b) {
    var items = b.items || [];
    if (!items.length) return '<div class="wrap" style="padding:24px 20px"><p class="label">Блок «Відгуки» з\'явиться на сайті, щойно ти додаси перший відгук</p></div>';
    return sec(b, head(b, true) + '<div class="revs">' + items.map(function (r) {
      return '<div class="rev"><div class="stars">' + new Array((r.stars || 5) + 1).join("★") + "</div><q>" + esc(r.quote) + '</q><div class="who">' + esc(r.name) + (r.when ? " · " + esc(r.when) : "") + "</div></div>";
    }).join("") + "</div>");
  };
  B.bespoke = function (b) {
    return sec(b, head(b) + "<div>" + (b.services || []).map(function (s) {
      return '<div class="svc-row"><div class="name">' + esc(s.name) + '</div><div class="desc">' + esc(s.text) + '</div><div class="amt">' + esc(s.price) + "</div></div>";
    }).join("") + "</div>" + (b.button_label ? '<p style="margin-top:30px"><a class="btn ghost">' + esc(b.button_label) + "</a></p>" : ""));
  };
  B.faq = function (b) {
    return sec(b, head(b) + '<div class="faq">' + (b.items || []).map(function (f, i) {
      return "<details" + (i === 0 ? " open" : "") + "><summary>" + esc(f.q) + "</summary><p>" + esc(f.a) + "</p></details>";
    }).join("") + "</div>");
  };
  B.closing = function (b) {
    return '<div class="wrap closing">' + (b.eyebrow ? '<div class="label">' + esc(b.eyebrow) + "</div>" : "") +
      '<h2 class="display">' + accent(b.title) + "</h2>" + (b.text ? "<p>" + esc(b.text) + "</p>" : "") +
      (b.button_label ? '<div class="acts"><a class="btn solid">' + esc(b.button_label) + "</a></div>" : "") + "</div>";
  };
  B.spacer = function (b) { return '<div class="spacer" style="--h:' + (b.height || 48) + 'px"></div>'; };

  /* product blocks: need the product being edited */
  B.product_hero = function (b, img, p) {
    var imgs = [p.cover].concat(p.gallery || []).filter(Boolean);
    return '<div class="wrap"><div class="crumbs">Home · Templates · ' + esc(p.title) + '</div><div class="pp"><div class="pp-gallery">' +
      '<div class="frame' + ratioClass(b.ratio) + '"' + ratio(b.ratio) + ">" + (imgs[0] ? '<img src="' + img(imgs[0]) + '">' : "") + "</div>" +
      (imgs.length > 1 ? '<div class="thumbs">' + imgs.map(function (i) { return '<button type="button"><img src="' + img(i) + '"></button>'; }).join("") + "</div>" : "") +
      '</div><div class="pp-info"><div class="label">' + esc(p.collection) + " · " + esc(p.format) + "</div><h1>" + esc(p.title) + "</h1>" +
      (p.summary ? '<p class="desc">' + esc(p.summary) + "</p>" : "") +
      ((p.includes || []).length ? '<ul class="incl-list">' + p.includes.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" : "") +
      '<div class="pricing"><span class="now">' + euro(p.price) + '</span></div><div class="acts">' + buy(p) + demo(p) + "</div>" +
      ((p.swatches || []).length ? '<div class="swatches" style="margin-top:20px">' + p.swatches.map(function (c) { return '<i style="background:' + esc(c) + '"></i>'; }).join("") + "</div>" : "") +
      "</div></div></div>";
  };
  B.product_about = function (b, img, p) { return p.body ? sec(b, head(b) + '<div class="prose">' + md(p.body) + "</div>") : ""; };
  B.product_demo = function (b, img, p) {
    if (!p.demo_url) return '<div class="wrap" style="padding:24px 20px"><p class="label">Смуга з демо з\'явиться, коли вставиш посилання на живе демо</p></div>';
    return B.band({ eyebrow: b.eyebrow, title: b.title, text: b.text, button_label: b.button_label || "Open the live demo →" });
  };
  B.related = function (b, img, p) {
    var others = SITE.products.filter(function (x) { return x.collection !== p.collection; }).slice(0, 3);
    return sec(b, head(b) + '<div class="related">' + others.map(function (x) {
      return '<a><div class="frame' + ratioClass(b.ratio) + '" style="--ratio:' + (b.ratio && b.ratio !== "default" && b.ratio !== "original" ? b.ratio : "4/3") + '"><img src="' + img(x.cover) + '"></div>' +
        '<span class="label">' + esc(x.collection) + "</span><h4>" + esc(x.title) + '</h4><span class="price">' + euro(x.price) + "</span></a>";
    }).join("") + "</div>");
  };

  /* ---------- theme (colours, fonts, animation) ---------- */
  function themeCSS(st) {
    st = st || {};
    var t = st.theme || {}, f = st.fonts || {};
    var fams = [SITE.fonts[f.display], SITE.fonts[f.body], SITE.fonts[f.ui]].filter(Boolean);
    var link = fams.length ? '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?' + fams.filter(function (x, i) { return fams.indexOf(x) === i; }).join("&") + '&display=swap">' : "";
    var css = ":root{" +
      "--ground:" + t.background + ";--surface:" + t.surface + ";--surface-2:" + t.surface_alt + ";" +
      "--ink:" + t.text + ";--ink-soft:" + t.text_soft + ";--muted:" + t.muted + ";" +
      "--line:" + t.lines + ";--line-soft:" + t.lines_soft + ";" +
      "--claret:" + t.accent + ";--claret-deep:" + t.accent_dark + ";--claret-wash:" + t.accent_wash + ";--gold:" + t.gold + ";" +
      '--font-display:"' + f.display + '";--font-body:"' + f.body + '";--font-ui:"' + f.ui + '"}' +
      "body{font-size:" + (f.base_size || 18) + "px;background:var(--ground);color:var(--ink)}";
    return link + "<style>" + css + "</style>";
  }
  function animCSS(st) {
    var a = (st && st.animation) || {};
    var sp = a.speed === "slow" ? "1.4s" : a.speed === "fast" ? ".5s" : ".9s";
    var from = { fade: "opacity:0", rise: "opacity:0;transform:translateY(28px)", zoom: "opacity:0;transform:scale(.97)", slide: "opacity:0;transform:translateX(-28px)" }[a.style];
    if (!from) return "";
    return "<style>@keyframes nsIn{from{" + from + "}to{opacity:1;transform:none}}[data-anim]{animation:nsIn " + sp + " cubic-bezier(.2,.7,.2,1) both}</style>";
  }
  function render(blocks, img, product, settings, withAnim) {
    var st = settings || SITE.settings;
    return themeCSS(st) + (withAnim ? animCSS(st) : "") + (blocks || []).filter(function (b) { return b && !b.hidden; }).map(function (b) {
      var fn = B[b.type];
      var inner = fn ? fn(b, img, product) : "";
      return '<div class="blk blk-' + b.type + '"' + (b.animate !== false ? " data-anim" : "") + ">" + inner + "</div>";
    }).join("");
  }

  /* ---------- preview templates ---------- */
  function htmlNode(html) { return h("div", { dangerouslySetInnerHTML: { __html: html } }); }
  function imgFn(props) { return function (path) { if (!path) return ""; var a = props.getAsset(path); return a ? a.toString() : path; }; }

  var PagePreview = createClass({
    getInitialState: function () { return { n: 0 }; },
    componentDidMount: function () { var self = this; ready.then(function () { self.setState({ n: 1 }); }); },
    render: function () {
      var data = this.props.entry.get("data").toJS();
      return htmlNode(render(data.blocks, imgFn(this.props)));
    }
  });

  var DEFAULT_PRODUCT_BLOCKS = [
    { type: "product_hero", ratio: "4/3" },
    { type: "product_about", title: "About this *collection*" },
    { type: "product_demo", eyebrow: "No surprises", title: "See it *live*", text: "Open the demo on your phone, press the RSVP, scroll the whole thing." },
    { type: "related", title: "You might also *love*" }
  ];
  var ProductPreview = createClass({
    getInitialState: function () { return { n: 0 }; },
    componentDidMount: function () { var self = this; ready.then(function () { self.setState({ n: 1 }); }); },
    render: function () {
      var p = this.props.entry.get("data").toJS();
      var blocks = p.blocks && p.blocks.length ? p.blocks : DEFAULT_PRODUCT_BLOCKS;
      return htmlNode(render(blocks, imgFn(this.props), p));
    }
  });

  var SettingsPreview = createClass({
    getInitialState: function () { return { n: 0 }; },
    componentDidMount: function () { var self = this; ready.then(function () { self.setState({ n: 1 }); }); },
    render: function () {
      var st = this.props.entry.get("data").toJS();
      var sample = [
        { type: "hero", eyebrow: "Wedding website templates", title: "A wedding site\nyour guests will\n*remember*.", text: "Так виглядатиме сайт з цими кольорами й шрифтами.", button_label: "Browse templates", button2_label: "View live demo →" },
        { type: "trust", items: [{ number: "11", text: "Sections written" }, { number: "One evening", text: "From buying to live" }, { number: "€0", text: "Monthly hosting" }] },
        { type: "templates", eyebrow: "Templates", title: "The full *collection*", soon_title: "Opening next" },
        { type: "band", eyebrow: "No surprises", title: "See it before *you buy it*", text: "Акцентна смуга з кнопкою.", button_label: "Open the demo →" },
        { type: "faq", eyebrow: "Questions", title: "Before *you buy*", items: [{ q: "Do I need to know design?", a: "No." }, { q: "Do I need Canva Pro?", a: "No." }] }
      ];
      var keepSite = SITE.settings; SITE.settings = st;
      var out = htmlNode(render(sample, imgFn(this.props), null, st, true));
      SITE.settings = keepSite;
      return out;
    }
  });

  var DefaultsPreview = createClass({
    getInitialState: function () { return { n: 0 }; },
    componentDidMount: function () { var self = this; ready.then(function () { self.setState({ n: 1 }); }); },
    render: function () {
      var data = this.props.entry.get("data").toJS();
      var p = SITE.products[0] || { title: "The Claret Letter", collection: "Claret", format: "Wedding website", price: 24, status: "available" };
      return htmlNode(render(data.blocks, imgFn(this.props), p));
    }
  });

  CMS.registerPreviewTemplate("pages", PagePreview);
  CMS.registerPreviewTemplate("templates", ProductPreview);
  CMS.registerPreviewTemplate("site", SettingsPreview);
  CMS.registerPreviewTemplate("product_defaults", DefaultsPreview);

  /* ---------- colour picker widget ---------- */
  var ColorControl = createClass({
    handle: function (e) { this.props.onChange(e.target.value); },
    render: function () {
      var v = this.props.value || "#000000";
      return h("div", { className: this.props.classNameWrapper, style: { display: "flex", alignItems: "center", gap: "12px" } },
        h("input", { type: "color", id: this.props.forID, value: /^#[0-9a-f]{6}$/i.test(v) ? v : "#000000", onChange: this.handle,
          style: { width: "48px", height: "36px", padding: 0, border: "1px solid #ccc", borderRadius: "4px", background: "none", cursor: "pointer" } }),
        h("input", { type: "text", value: v, onChange: this.handle, style: { border: 0, outline: 0, fontFamily: "monospace", fontSize: "15px", width: "110px" } })
      );
    }
  });
  var ColorPreview = createClass({
    render: function () {
      return h("span", { style: { display: "inline-block", width: "18px", height: "18px", borderRadius: "50%", background: this.props.value, border: "1px solid #ccc" } });
    }
  });
  CMS.registerWidget("color", ColorControl, ColorPreview);
})();
