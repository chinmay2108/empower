/*
 * The render pass for docs/design-double-check.md.
 *
 * It opens every screen it can reach, reads the computed style of every element, and lists each value
 * that is not exactly one token from css/design-system.css. It changes nothing.
 *
 * How to run: serve the repository (python3 -m http.server 8931 --bind 127.0.0.1), then give this whole
 * function to a browser automation tool that passes a Playwright page (for example the Playwright MCP's
 * "run code" tool). Run it once per width in WIDTHS. It needs no installed packages.
 *
 * Reading the result: a value listed here is not always a mistake. Two tokens joined (two shadows, a
 * size plus the phone's safe area) and "auto" margins show up as numbers no single token holds. Trace
 * each one to its recipe; anything that does not trace back to tokens is a finding.
 */
async (page) => {
  const ROOT = "http://127.0.0.1:8931/";
  const WIDTHS = [[390, 844], [1280, 900]];
  const START = ["index.html", "pages/onboarding.html", "pages/lab.html", "pages/browse.html", "pages/thread.html"];
  const PER_PAGE = 5; // how many different addresses of one page (different groups, people) to open
  page.setDefaultTimeout(4000);

  const audit = () => {
    const vars = {};
    const walk = (rules) => {
      for (const rule of rules) {
        if (rule.styleSheet) { try { walk(rule.styleSheet.cssRules); } catch (e) { /* unreadable sheet */ } continue; }
        if (rule.selectorText === ":root") { for (const name of rule.style) { if (name.startsWith("--")) vars[name] = rule.style.getPropertyValue(name).trim(); } }
        else if (rule.cssRules) walk(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch (e) { /* unreadable sheet */ } }

    // Ask the browser what each token computes to, so tokens and elements are compared in the same form.
    const probe = document.createElement("div");
    document.body.appendChild(probe);
    const computed = (property, value) => { probe.style.cssText = ""; probe.style.setProperty(property, value); return getComputedStyle(probe).getPropertyValue(property); };
    const tokens = (prefix, property) => { const found = {}; Object.keys(vars).filter((name) => name.startsWith(prefix)).forEach((name) => { found[computed(property, "var(" + name + ")")] = name; }); return found; };
    const T = {
      colour: tokens("--color-", "color"), size: tokens("--type-size-", "font-size"), weight: tokens("--type-weight-", "font-weight"),
      space: tokens("--space-", "width"), sizes: tokens("--size-", "width"), radius: tokens("--radius-", "border-top-left-radius"),
      shadow: tokens("--shadow-", "box-shadow"), duration: tokens("--motion-duration-", "transition-duration"), border: tokens("--border-width-", "width"),
    };
    const layer = {}, opacity = {};
    Object.keys(vars).forEach((name) => { if (name.startsWith("--layer-")) layer[vars[name]] = name; if (name.startsWith("--opacity-")) opacity[String(parseFloat(vars[name]))] = name; });
    const numbers = (prefix) => Object.keys(vars).filter((name) => name.startsWith(prefix)).map((name) => parseFloat(vars[name]));
    const letterSpacing = numbers("--type-letter_spacing-"), lineHeight = numbers("--type-line_height-");
    probe.remove();

    const off = {}, used = {};
    let count = 0;
    const note = (category, value, el) => {
      const key = category + " | " + value;
      const cls = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className;
      (off[key] = off[key] || { n: 0, example: el.tagName.toLowerCase() + "." + String(cls).split(" ").slice(0, 2).join(".") }).n++;
    };
    const hit = (map, value) => { if (map[value]) { used[map[value]] = 1; return true; } return false; };
    const lengths = Object.assign({}, T.sizes, T.border, T.space);

    document.querySelectorAll("body *").forEach((el) => {
      if (/^(SCRIPT|STYLE|OPTION|PATH|CIRCLE|RECT|LINE|G|DEFS|LINK|META)$/i.test(el.tagName)) return;
      const s = getComputedStyle(el);
      if (s.display === "none") return;
      count++;
      ["color", "background-color", "border-top-color", "outline-color"].forEach((property) => {
        const value = s.getPropertyValue(property);
        if (property === "border-top-color" && s.borderTopWidth === "0px") return;
        if (property === "outline-color" && s.outlineStyle === "none") return;
        if (value === "rgba(0, 0, 0, 0)") return;
        if (!hit(T.colour, value)) note("colour (" + property + ")", value, el);
      });
      const hasText = [...el.childNodes].some((child) => child.nodeType === 3 && child.textContent.trim());
      if (hasText) {
        if (!hit(T.size, s.fontSize)) note("text size", s.fontSize, el);
        if (!hit(T.weight, s.fontWeight)) note("text weight", s.fontWeight, el);
        if (s.lineHeight === "normal") note("line height", "normal", el);
        else { const ratio = parseFloat(s.lineHeight) / parseFloat(s.fontSize); if (!lineHeight.some((x) => Math.abs(x - ratio) < 0.02)) note("line height ratio", ratio.toFixed(2), el); }
        if (s.letterSpacing !== "normal") { const em = parseFloat(s.letterSpacing) / parseFloat(s.fontSize); if (!letterSpacing.some((x) => Math.abs(x - em) < 0.005)) note("letter spacing (em)", em.toFixed(3), el); }
      }
      ["padding-top", "padding-right", "padding-bottom", "padding-left", "margin-top", "margin-bottom", "row-gap", "column-gap"].forEach((property) => {
        const value = s.getPropertyValue(property);
        if (value === "0px" || value === "auto" || value === "normal" || hit(lengths, value)) return;
        if (value.startsWith("-") && hit(lengths, value.slice(1))) return;
        note("spacing (" + property.replace(/-(top|right|bottom|left)/, "") + ")", value, el);
      });
      const radius = s.borderTopLeftRadius;
      if (radius !== "0px" && radius !== "50%" && !hit(T.radius, radius)) note("corner radius", radius, el);
      if (s.boxShadow !== "none" && !hit(T.shadow, s.boxShadow)) note("shadow", s.boxShadow.slice(0, 80), el);
      s.transitionDuration.split(", ").forEach((value) => { if (value !== "0s" && !hit(T.duration, value)) note("motion duration", value, el); });
      if (s.animationName !== "none") s.animationDuration.split(", ").forEach((value) => { if (!hit(T.duration, value)) note("animation duration", value, el); });
      if (s.zIndex !== "auto" && !hit(layer, s.zIndex)) note("layer", s.zIndex, el);
      if (s.opacity !== "1" && !hit(opacity, String(parseFloat(s.opacity)))) note("opacity", s.opacity, el);
      if (s.borderTopWidth !== "0px" && !hit(T.border, s.borderTopWidth)) note("border width", s.borderTopWidth, el);
    });
    const links = [...document.querySelectorAll("a[href]")].map((a) => a.href).filter((href) => href.startsWith(location.origin) && !/components\.html|prototype|#/.test(href));
    return { off, count, links, tokensRead: Object.keys(vars).length, used: Object.keys(used) };
  };

  const report = {};
  for (const [width, height] of WIDTHS) {
    await page.setViewportSize({ width, height });
    const seen = new Set(), queue = START.map((p) => ROOT + p), perPage = {}, found = {}, usedTokens = {};
    let elements = 0, tokensRead = 0;
    while (queue.length && seen.size < 80) {
      const url = queue.shift();
      if (seen.has(url)) continue;
      const name = url.replace(ROOT, "").split("?")[0];
      perPage[name] = (perPage[name] || 0) + 1;
      if (perPage[name] > PER_PAGE) continue;
      seen.add(url);
      try { await page.goto(url); await page.waitForTimeout(350); } catch (e) { continue; }
      const result = await page.evaluate(audit);
      elements += result.count; tokensRead = result.tokensRead;
      result.used.forEach((token) => { usedTokens[token] = 1; });
      result.links.forEach((link) => { if (!seen.has(link)) queue.push(link); });
      Object.keys(result.off).forEach((key) => {
        const row = found[key] = found[key] || { n: 0, example: result.off[key].example, pages: new Set() };
        row.n += result.off[key].n; row.pages.add(name.split("/").pop());
      });
    }
    report[width + " wide"] = {
      screens: seen.size, elements, tokensRead, tokensSeenAtRest: Object.keys(usedTokens).length,
      notOneToken: Object.keys(found).sort().map((key) => key + "  x" + found[key].n + "  e.g. " + found[key].example + "  [" + [...found[key].pages].slice(0, 3).join(", ") + "]"),
    };
  }
  return report;
}
