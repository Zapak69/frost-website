(function () {
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('navMobileMenu');
  if (!hamburger || !mobileMenu) return;
  hamburger.addEventListener('click', function () {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });
})();

(function () {
  const MAX_BYTES = 25 * 1024 * 1024;
  const LINE_H = 20;
  const ICONS = {
    crash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    unknown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>'
  };
  const BENIGN = [/realms/i, /Missing sound for event/, /could not find sampler named/, /Couldn't load skin/i, /Unknown custom character/, /Reference map '.*' for .* could not be read/, /does not specify "minVersion"/, /Failed to load server list/, /Received passengers for unknown entity/, /Narrator library/i, /limits mip level/, /Ambiguous mapping/i, /Failed to verify authentication/i, /Unable to load model: '.*' referenced from/];
  const EXIT_CODES = {
    '-1073741819': ['Access violation (0xC0000005)', 'A native crash, usually in the graphics driver. Update your graphics driver.'],
    '-1073740791': ['Stack buffer overrun (0xC0000409)', 'A native crash, often caused by overlay software (Discord, RivaTuner, MSI Afterburner) or a broken driver. Close overlays and update your graphics driver.'],
    '-805306369': ['Game stopped responding (0xCFFFFFFF)', 'The game froze and was killed by Windows. Usually not enough RAM or a mod stuck in a loop.'],
    '-1073741571': ['Stack overflow (0xC00000FD)', 'Something called itself forever. Usually a mod bug; look for the mods in the error above.'],
    '-1': ['Generic failure (-1)', 'The game stopped with a generic error. The real reason is earlier in the log.']
  };
  const DLL_VENDORS = [[/^(atio6axx|atioglxx|atig6pxx|amdxx64|amdxc64|aticfx64)/i, 'AMD'], [/^(nvoglv64|nvoglv32|nvwgf2umx|nvd3dumx|nvogl)/i, 'NVIDIA'], [/^(ig\d+icd\d*|igxelpicd64|igdumdim64|ig75icd64)/i, 'Intel']];

  const RULES = [
    { id: 'missing-dep', sev: 'crash', re: /Mod '(.+?)' \((.+?)\) \S+ requires (.+?) of (?:mod '(.+?)' \((.+?)\)|([\w.\-]+)), which is missing!?/g, many: true, make: function (m) {
      const dep = m[4] || m[6];
      return { title: 'Missing mod: ' + m[1] + ' needs ' + dep, cause: m[1] + ' cannot run without ' + dep + (m[3] && m[3] !== 'any version' ? ' (' + m[3] + ')' : '') + ', and it is not installed.', fix: 'Install ' + dep + ' for your Minecraft version, or remove ' + m[1] + '.' };
    } },
    { id: 'wrong-mc', sev: 'crash', re: /Mod '(.+?)' \((.+?)\) (\S+) requires (?:version )?(.+?) of minecraft, but only the wrong version is present: (\S+?)!?$/gm, many: true, make: function (m) {
      return { title: m[1] + ' is for a different Minecraft version', cause: m[1] + ' ' + m[3] + ' was made for Minecraft ' + m[4] + ', but you are running ' + m[5] + '.', fix: 'Download the version of ' + m[1] + ' made for ' + m[5] + ', or remove it.' };
    } },
    { id: 'wrong-java-fabric', sev: 'crash', re: /Mod '(.+?)' \((.+?)\) \S+ requires (?:version )?(.+?) of (?:mod 'OpenJDK.*?' \()?java\)?, but only the wrong version is present: (\S+?)!?$/gm, many: true, make: function (m) {
      return { title: m[1] + ' needs a newer Java', cause: m[1] + ' needs Java ' + m[3] + ', but the game runs on Java ' + m[4] + '.', fix: 'Switch the profile to Java ' + m[3].replace(/[^\d.]/g, '') + ' or newer. Minecraft 1.20.5+ needs Java 21.' };
    } },
    { id: 'breaks', sev: 'crash', re: /Mod '(.+?)' \((.+?)\) \S+ is incompatible with (.+?) of mod '(.+?)' \((.+?)\), but a matching version is present: (\S+?)!?$/gm, many: true, make: function (m) {
      return { title: m[1] + ' does not work with ' + m[4], cause: m[1] + ' is marked as incompatible with ' + m[4] + ' ' + m[6] + '.', fix: 'Remove ' + m[4] + ' or ' + m[1] + ', or check if a newer version of either fixes it.' };
    } },
    { id: 'duplicate', sev: 'crash', re: /Mod ID '(.+?)' from mod files:\s*\n\s*- (.+)\n\s*- (.+)/g, many: true, make: function (m) {
      return { title: 'The same mod is installed twice: ' + m[1], cause: 'Two files of ' + m[1] + ' are in the mods folder: ' + m[2].trim() + ' and ' + m[3].trim() + '.', fix: 'Delete the older file and keep one version.' };
    } },
    { id: 'duplicate-generic', sev: 'crash', re: /(?:Found duplicate mods|Duplicate mod(?:s)? found|DuplicateModsFoundException)/, skipIf: ['duplicate'], make: function () {
      return { title: 'The same mod is installed twice', cause: 'A mod is in the mods folder more than once.', fix: 'Look for two versions of the same mod and delete the older one.' };
    } },
    { id: 'class-version', sev: 'crash', re: /([\w/$.]+) has been compiled by a more recent version of the Java Runtime \(class file version (\d+)\.\d+\), this version of the Java Runtime only recognizes class file versions up to (\d+)\.\d+/, make: function (m) {
      const need = Number(m[2]) - 44;
      const have = Number(m[3]) - 44;
      return { title: 'Java ' + have + ' is too old', cause: 'Part of the game or a mod (' + m[1].split('/').slice(0, 3).join('.') + ') needs Java ' + need + ', but the game is started with Java ' + have + '.', fix: 'Set the profile to use Java ' + need + ' or newer.' };
    } },
    { id: 'oom', sev: 'crash', re: /java\.lang\.OutOfMemoryError(?:: (.+))?/, make: function (m, ctx) {
      const ram = ctx.env.ram ? ' The game had ' + ctx.env.ram + '.' : '';
      if (m[1] && /Metaspace|unable to create native thread|Direct buffer/i.test(m[1])) return { title: 'Out of memory (' + m[1] + ')', cause: 'Java ran out of a special memory area: ' + m[1] + '.' + ram, fix: 'Restart your PC, close other programs and lower your render distance. If it keeps happening, look for a mod that loads a lot of data.' };
      return { title: 'The game ran out of memory', cause: 'Minecraft used up all the RAM it was given.' + ram, fix: 'Give the game more RAM in the launcher (4–6 GB is plenty for most modpacks), lower the render distance or remove heavy mods.' };
    } },
    { id: 'heap-reserve', sev: 'crash', re: /Could not reserve enough space for (\d+)KB object heap/, make: function (m, ctx) {
      const gb = Math.round(Number(m[1]) / 1048576 * 10) / 10;
      return { title: 'Java cannot get ' + gb + ' GB of RAM', cause: 'The launcher asks for ' + gb + ' GB of RAM' + (ctx.env.java32 ? ' and the game runs on 32-bit Java, which can use at most about 1.5 GB' : ', which your PC cannot give it') + '.', fix: 'Lower the allocated RAM in the launcher' + (ctx.env.java32 ? ' and switch to 64-bit Java' : '') + '.' };
    } },
    { id: 'heap-invalid', sev: 'crash', re: /Invalid (?:maximum|initial) heap size: (-Xm[xs]\S+)/, make: function (m) {
      return { title: 'Invalid RAM setting', cause: 'The Java argument ' + m[1] + ' is not valid.', fix: 'Fix the RAM value in the launcher settings, for example -Xmx4G.' };
    } },
    { id: 'redirect-conflict', sev: 'crash', re: /@Redirect conflict\. Skipping (\S+?) from mod (\S+?)->.*?already redirected by (\S+?) from mod (\S+?)->/g, many: true, make: function (m) {
      return { title: m[2] + ' clashes with ' + m[4], cause: 'Both ' + m[2] + ' and ' + m[4] + ' try to change the same part of the game code.', fix: 'Update both mods. If it still crashes, remove one of them.' };
    } },
    { id: 'overwrite-conflict', sev: 'error', re: /Method overwrite conflict for (\S+) in (\S+?) from mod (\S+?), previously written by (\S+?)(?: from mod (\S+?))?\./g, many: true, make: function (m) {
      return { title: m[3] + ' overlaps with ' + (m[5] || m[4]), cause: 'Two mods replace the same method (' + m[1] + ').', fix: 'Usually harmless, but if you see bugs or crashes, remove one of these mods.' };
    } },
    { id: 'mixin', sev: 'crash', re: /Mixin apply(?: for mod (\S+))? failed (\S+?)(?: from mod (\S+))? ->|MixinTransformerError|InvalidInjectionException|InjectionError|MixinApplyError/, skipIf: ['redirect-conflict'], make: function (m, ctx) {
      const mod = m[1] || m[3] || (m[2] ? m[2].split('.')[0] : '') || ctx.mixinMod;
      return { title: mod ? mod + ' failed to load its changes (mixin)' : 'A mod failed to load its changes (mixin)', cause: (mod ? mod : 'A mod') + ' could not patch the game. It is usually made for a different Minecraft version or conflicts with another mod.', fix: mod ? 'Update ' + mod + ' to the version for your Minecraft, or remove it.' : 'Update your mods. If it keeps happening, remove recently added mods one by one.' };
    } },
    { id: 'native', sev: 'crash', re: /(EXCEPTION_ACCESS_VIOLATION|EXCEPTION_ILLEGAL_INSTRUCTION|SIGSEGV|SIGBUS)[\s\S]*?Problematic frame:\s*\n#\s+[CJVj]\s+\[?([^\]+\s]+)/, make: function (m) {
      const file = m[2];
      const vendor = (DLL_VENDORS.find(function (d) { return d[0].test(file); }) || [])[1];
      if (vendor) return { title: 'The ' + vendor + ' graphics driver crashed', cause: 'The crash happened inside ' + file + ', which is part of the ' + vendor + ' graphics driver.', fix: 'Install the latest ' + vendor + ' driver from the official ' + vendor + ' website (not Windows Update). If it is a laptop, also update the Intel/AMD integrated driver.' };
      if (/^(jvm\.dll|libjvm)/i.test(file)) return { title: 'Java itself crashed', cause: 'The crash happened inside Java (' + file + ').', fix: 'Reinstall Java or let the launcher use its bundled Java. Unstable RAM overclocks can also cause this.' };
      if (/lwjgl|opengl32|glfw/i.test(file)) return { title: 'The graphics stack crashed', cause: 'The crash happened in ' + file + ', between the game and the graphics driver.', fix: 'Update your graphics driver and turn off overlays (Discord, RivaTuner, OBS game capture).' };
      return { title: 'Native crash in ' + file, cause: 'Minecraft crashed outside of Java, in ' + file + '.', fix: 'Search for ' + file + ' to see which program it belongs to. Updating drivers and closing overlay programs usually helps.' };
    } },
    { id: 'no-opengl', sev: 'crash', re: /WGL: The driver does not appear to support OpenGL|GLFW error 65542|Pixel format not accelerated|OpenGL 1\.1 \(?GDI Generic|WGL_ARB_create_context_profile is unavailable/, make: function (m, ctx) {
      return { title: 'No working graphics driver', cause: 'The PC has no proper OpenGL driver' + (ctx.env.basicGpu ? ' (Windows is using the Microsoft Basic Display Adapter)' : '') + ', so Minecraft cannot open its window.', fix: 'Install the driver for your graphics card from NVIDIA, AMD or Intel. On laptops, make sure Minecraft runs on the dedicated GPU.' };
    } },
    { id: 'config', sev: 'crash', re: /(?:Failed to (?:load|read|parse) config(?: file)?:? ?(\S+)?[\s\S]{0,400}?)?(?:MalformedJsonException|JsonSyntaxException|ParsingException|TomlParseException)[^\n]*/, make: function (m, ctx) {
      const file = m[1] || ((ctx.text.match(/config[\\/][\w.\-\\/]+\.(?:json5?|toml|properties|txt)/) || [])[0]);
      return { title: 'A config file is damaged' + (file ? ': ' + file : ''), cause: 'A mod could not read its settings file because it is broken or was edited badly.', fix: file ? 'Delete ' + file + ' (it will be recreated with default settings).' : 'Find the config file of the mod in the error and delete it so it is recreated.' };
    } },
    { id: 'entrypoint', sev: 'crash', re: /Could not execute entrypoint stage '(\w+)' due to errors, provided by '([^']+)'/g, many: true, make: function (m, ctx) {
      const name = ctx.modName(m[2]);
      return { title: name + ' crashed while starting', cause: name + ' threw an error while the game was loading (' + m[1] + ' stage).' + (ctx.lastCause ? ' Underlying error: ' + ctx.lastCause : ''), fix: 'Update ' + name + '. If it still crashes, remove it or check the errors below it in the log.' };
    } },
    { id: 'manual', sev: 'crash', re: /Manually triggered debug crash/, make: function () {
      return { title: 'Crash triggered on purpose (F3 + C)', cause: 'Holding F3 + C for 10 seconds crashes the game on purpose for debugging.', fix: 'Nothing is broken. Just start the game again.' };
    } },
    { id: 'zip', sev: 'crash', re: /(?:Error analyzing \[([^\]]+)\][^\n]*)?(?:ZipException|zip END header not found|invalid LOC header|ZipError|zip file is empty)/, make: function (m, ctx) {
      const file = m[1] || ((ctx.text.match(/mods[\\/][^\s\]'"]+\.jar/) || [])[0]);
      return { title: 'A mod file is corrupted' + (file ? ': ' + file : ''), cause: 'A .jar file is broken or was only partly downloaded.', fix: file ? 'Delete ' + file + ' and download it again.' : 'Download your recently added mods again.' };
    } },
    { id: 'class-missing', sev: 'crash', re: /java\.lang\.(NoClassDefFoundError|ClassNotFoundException): ([\w/$.]+)/, skipIf: ['missing-dep', 'wrong-mc', 'class-version'], make: function (m) {
      const cls = m[2].replace(/\//g, '.');
      return { title: 'A required class is missing', cause: 'Something tried to use ' + cls + ', which does not exist. A library mod is missing or a mod was made for a different version.', fix: 'Check that all dependencies are installed and every mod matches your Minecraft and loader version.' };
    } },
    { id: 'optifine', sev: 'error', re: /optifabric|OptiFine/i, test: function (ctx) { return /fabric/i.test(ctx.text) && /\bsodium\b/i.test(ctx.text) && /- optifabric|optifine.*\.jar|OptiFine_/i.test(ctx.text); }, make: function () {
      return { title: 'OptiFine with Sodium', cause: 'OptiFine and Sodium both rewrite the renderer and do not work together.', fix: 'Remove OptiFine/OptiFabric. Sodium + Iris cover the same features.' };
    } },
    { id: 'stackoverflow', sev: 'crash', re: /java\.lang\.StackOverflowError/, make: function () {
      return { title: 'Infinite loop (StackOverflowError)', cause: 'A piece of code called itself over and over until Java gave up. Usually two mods triggering each other.', fix: 'Look at the mods named in the lines under the error and update or remove them.' };
    } },
    { id: 'ticking', sev: 'crash', re: /Description: Ticking (entity|block entity|player)[\s\S]*?(?:Entity Type: (\S+)|Name: (\S+))?/, make: function (m) {
      const what = m[2] || m[3];
      return { title: 'Crash while updating a ' + m[1] + (what ? ' (' + what + ')' : ''), cause: 'A ' + m[1] + ' in the world crashed while it was being updated. It can be a broken entity or a mod that adds it.', fix: 'Update the mod that adds it. If it happens in one world only, the entity may be corrupted; a world backup or removing it with a tool like MCA Selector helps.' };
    } },
    { id: 'concurrent', sev: 'crash', re: /java\.util\.ConcurrentModificationException/, make: function () {
      return { title: 'Threading bug in a mod', cause: 'Two parts of the game changed the same data at the same time (ConcurrentModificationException).', fix: 'Update your mods. The mod is usually named in the lines right under the error.' };
    } },
    { id: 'shader', sev: 'error', re: /(?:Failed to compile shader|Shader compilation failed|Could not compile shader program|ShaderCompileException)[^\n]*/, make: function () {
      return { title: 'A shader failed to compile', cause: 'The shader pack has an error or does not support your graphics card.', fix: 'Try a different shader pack or update it and your graphics driver.' };
    } },
    { id: 'network', sev: 'error', re: /(?:UnknownHostException|SSLHandshakeException|Connection timed out|ConnectException: Connection refused)[^\n]*/, make: function () {
      return { title: 'Network problems', cause: 'The game could not reach a server it needed.', fix: 'Check your internet connection, VPN or antivirus. This rarely crashes the game by itself.' };
    } },
    { id: 'exitcode', sev: 'crash', re: /(?:exit(?:ed)? (?:with )?code|exit code:?|Process crashed with exit code) (-?\d+)/i, make: function (m) {
      const info = EXIT_CODES[m[1]];
      if (!info) return null;
      return { title: 'Exit code ' + m[1] + ': ' + info[0], cause: info[1], fix: info[1] };
    } }
  ];

  const els = {
    input: document.getElementById('laInput'),
    drop: document.getElementById('laDrop'),
    file: document.getElementById('laFile'),
    paste: document.getElementById('laPaste'),
    analyze: document.getElementById('laAnalyze'),
    sample: document.getElementById('laSample'),
    error: document.getElementById('laError'),
    results: document.getElementById('laResults'),
    log: document.getElementById('laLog'),
    space: document.getElementById('laLogSpace'),
    search: document.getElementById('laSearch')
  };
  let lines = [];
  let levels = [];
  let view = [];
  let filter = 'all';
  let query = '';
  let flashLine = -1;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function showError(msg) {
    els.error.textContent = msg;
    els.error.hidden = !msg;
  }

  function classify(line) {
    if (/^\s+at |^\s+\.\.\. \d+ more|^\s*~\[|^\s+\[\w+/.test(line)) return 'trace';
    if (/\/(ERROR|FATAL)\]|\[(ERROR|FATAL)\]|^\s*Exception in thread|^\s*Caused by:|^[\w.$]+(Exception|Error)(:|\s*$)|^#\s+(A fatal error|EXCEPTION_|SIGSEGV|SIGBUS)|^Error occurred|^Could not reserve|^---- Minecraft Crash Report|#@!@# Game crashed|Unable to start the game|FormattedException|crashed with exit code|exited with code -?[1-9]/.test(line)) return BENIGN.some(function (r) { return r.test(line); }) ? 'minor' : 'err';
    if (/\/WARN\]|\[WARN(ING)?\]|^WARNING:|warning:/i.test(line)) return 'warn';
    return '';
  }

  function lineOf(text, index) {
    let n = 0;
    let i = text.indexOf('\n');
    while (i !== -1 && i < index) {
      n++;
      i = text.indexOf('\n', i + 1);
    }
    return n;
  }

  function parseEnv(text) {
    const env = {};
    const get = function (re) { const m = text.match(re); return m ? m[1].trim() : ''; };
    env.mc = get(/Loading Minecraft (\S+) with/) || get(/Minecraft Version: (\S+)/) || get(/Fabric-?Loader.*?minecraft (\d[\w.\-]*)/i);
    const fabric = get(/with Fabric Loader (\S+)/) || get(/fabricloader[ :]+(\d[\w.+\-]*)/);
    const quilt = get(/with Quilt Loader (\S+)/);
    const neo = get(/NeoForge(?: version)?[: ]+(\d[\w.\-]*)/);
    const forge = get(/(?:MinecraftForge|Forge) v?(\d+\.\d+\.\d+)/);
    env.loader = quilt ? 'Quilt ' + quilt : fabric ? 'Fabric ' + fabric : neo ? 'NeoForge ' + neo : forge ? 'Forge ' + forge : '';
    env.java = get(/Java Version: ([^\n,]+)/) || get(/^\s*- java (\d+)/m) || get(/JRE version: .*?\((\d[\d.+]*)/);
    const mods = get(/Loading (\d+) mods/);
    env.mods = mods ? mods : '';
    env.gpu = get(/Graphics card #0 name: (.+)/) || get(/GL Caps:.*?Renderer: (.+)/) || get(/Backend API: .*? GL version [\d.]+.*?, (.+)/);
    env.os = get(/Operating System: (.+)/) || get(/^Host: .*?,\s+(Windows[^,]*|Linux[^,]*|macOS[^,]*)/m);
    const xmx = get(/-Xmx(\d+[MmGg])/);
    env.ram = xmx ? (/[gG]$/.test(xmx) ? xmx.slice(0, -1) + ' GB' : Math.round(parseInt(xmx, 10) / 1024 * 10) / 10 + ' GB') : '';
    env.basicGpu = /Microsoft Basic Display Adapter|GDI Generic/.test(text);
    env.java32 = /Client VM|Program Files \(x86\)[\\/]Java|\bx86\b.*java/i.test(text);
    return env;
  }

  function modNames(text) {
    const map = {};
    const re = /^\t\t([\w\-.]+): (.+?) \S+$/gm;
    let m;
    while ((m = re.exec(text))) map[m[1]] = m[2];
    return function (id) { return map[id] || id; };
  }

  function analyze(text, name) {
    text = text.replace(/\r\n?/g, '\n');
    lines = text.split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    levels = lines.map(classify);
    for (let i = 1; i < levels.length; i++) if (levels[i] === 'trace' && levels[i - 1] !== 'err' && levels[i - 1] !== 'trace-err') levels[i] = 'trace-dim'; else if (levels[i] === 'trace') levels[i] = 'trace-err';
    const env = parseEnv(text);
    const causes = text.match(/Caused by: ([^\n]+)/g);
    const ctx = { text: text, env: env, modName: modNames(text), lastCause: causes ? causes[causes.length - 1].replace('Caused by: ', '').slice(0, 220) : '', mixinMod: '' };
    const findings = [];
    const hit = {};
    RULES.forEach(function (rule) {
      if (rule.skipIf && rule.skipIf.some(function (id) { return hit[id]; })) return;
      if (rule.test && !rule.test(ctx)) return;
      const seen = {};
      const run = function (m) {
        const f = rule.make(m, ctx);
        if (!f || seen[f.title]) return;
        seen[f.title] = true;
        hit[rule.id] = true;
        findings.push(Object.assign({ sev: rule.sev, line: lineOf(text, m.index + (m[0].length && m[0][0] === '\n' ? 1 : 0)) }, f));
      };
      if (rule.many) {
        const re = new RegExp(rule.re.source, rule.re.flags.indexOf('g') === -1 ? rule.re.flags + 'g' : rule.re.flags);
        let m;
        let guard = 0;
        while ((m = re.exec(text)) && guard++ < 20) {
          run(m);
          if (!m[0].length) re.lastIndex++;
        }
      } else {
        const m = text.match(rule.re);
        if (m) run(m);
      }
    });
    if (hit['exitcode'] && findings.some(function (f) { return f.sev === 'crash' && f.title.indexOf('Exit code') !== 0; })) {
      const i = findings.findIndex(function (f) { return f.title.indexOf('Exit code') === 0; });
      if (i !== -1) findings[i].sev = 'error';
    }
    const errCount = levels.filter(function (l) { return l === 'err'; }).length;
    const warnCount = levels.filter(function (l) { return l === 'warn'; }).length;
    const crashed = findings.some(function (f) { return f.sev === 'crash'; }) || /---- Minecraft Crash Report ----|#@!@# Game crashed!|A fatal error has been detected by the Java Runtime|Exception in thread "main"|Unable to start the game|Incompatible mods found!|Mod resolution failed|Mod discovery failed|crashed with exit code|exited with code -?[1-9]/.test(text);
    findings.sort(function (a, b) { return (a.sev === 'crash' ? 0 : 1) - (b.sev === 'crash' ? 0 : 1) || a.line - b.line; });
    if (crashed && !findings.some(function (f) { return f.sev === 'crash'; })) {
      const first = levels.indexOf('err');
      const exc = (text.match(/(?:^|\n)((?:java|net|com|org|[a-z]+)\.[\w.$]+(?:Exception|Error)[^\n]*)/) || [])[1];
      findings.unshift({ sev: 'unknown', line: first === -1 ? 0 : first, title: 'The game crashed, but the cause is not a known pattern', cause: exc ? 'The main error is: ' + exc.slice(0, 260) + (ctx.lastCause ? '. Underlying error: ' + ctx.lastCause : '') : 'The log shows a crash, but no clear error message.', fix: 'Look at the highlighted error lines and the mod names in the stack trace. Removing recently added mods one by one usually finds the culprit. You can also send the log to our Discord support.' });
    }
    render(name, env, findings, crashed, errCount, warnCount);
  }

  function render(name, env, findings, crashed, errCount, warnCount) {
    const v = document.getElementById('laVerdict');
    const title = document.getElementById('laVerdictTitle');
    const text = document.getElementById('laVerdictText');
    const icon = document.getElementById('laVerdictIcon');
    const known = findings.filter(function (f) { return f.sev === 'crash'; }).length;
    let kind;
    if (crashed) {
      kind = known ? 'crash' : 'unknown';
      title.textContent = known ? 'The game crashed. We found ' + (known === 1 ? 'the likely cause' : known + ' likely causes') + '.' : 'The game crashed';
      text.textContent = known ? 'Start with the first problem below. Fixing it often makes the others disappear.' : "We couldn't match the crash to a known cause, but the errors are highlighted in the log below.";
    } else if (errCount || findings.length) {
      kind = 'error';
      title.textContent = 'No crash, but there are ' + (errCount || findings.length) + ' error' + ((errCount || findings.length) === 1 ? '' : 's');
      text.textContent = 'The game did not crash in this log. The errors below may cause missing features or bugs.';
    } else {
      kind = 'ok';
      title.textContent = 'This log looks fine';
      text.textContent = 'We found no crashes and no errors.' + (warnCount ? ' The ' + warnCount + ' warning' + (warnCount === 1 ? ' is' : 's are') + ' normal and can be ignored.' : '');
    }
    v.className = 'la-verdict is-' + kind;
    icon.innerHTML = ICONS[kind];
    const envEl = document.getElementById('laEnv');
    envEl.innerHTML = '';
    [['Minecraft', env.mc], ['Loader', env.loader], ['Mods', env.mods], ['Java', env.java], ['RAM', env.ram], ['Graphics', env.gpu], ['System', env.os]].forEach(function (p) {
      if (!p[1]) return;
      const d = el('div', 'la-env-item');
      d.appendChild(el('dt', '', p[0]));
      d.appendChild(el('dd', '', p[1]));
      envEl.appendChild(d);
    });
    envEl.hidden = !envEl.children.length;
    const fEl = document.getElementById('laFindings');
    fEl.innerHTML = '';
    findings.forEach(function (f) {
      const card = el('article', 'la-finding is-' + f.sev);
      const head = el('div', 'la-finding-head');
      head.appendChild(el('span', 'la-sev', f.sev === 'crash' ? 'Crash cause' : f.sev === 'unknown' ? 'Unknown crash' : 'Problem'));
      head.appendChild(el('h3', '', f.title));
      card.appendChild(head);
      card.appendChild(el('p', 'la-finding-cause', f.cause));
      const fix = el('p', 'la-finding-fix');
      fix.appendChild(el('strong', '', 'How to fix: '));
      fix.appendChild(document.createTextNode(f.fix));
      card.appendChild(fix);
      const jump = el('button', 'la-jump', 'Show in log · line ' + (f.line + 1));
      jump.type = 'button';
      jump.addEventListener('click', function () { jumpTo(f.line); });
      card.appendChild(jump);
      fEl.appendChild(card);
    });
    document.getElementById('laCountAll').textContent = lines.length.toLocaleString();
    document.getElementById('laCountErr').textContent = errCount.toLocaleString();
    document.getElementById('laCountWarn').textContent = warnCount.toLocaleString();
    document.getElementById('laFileName').textContent = name || '';
    filter = 'all';
    query = '';
    els.search.value = '';
    syncChips();
    els.input.hidden = true;
    els.results.hidden = false;
    rebuildView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function syncChips() {
    document.querySelectorAll('.la-chip').forEach(function (c) {
      c.classList.toggle('is-active', c.dataset.filter === filter);
      c.setAttribute('aria-pressed', String(c.dataset.filter === filter));
    });
  }

  function rebuildView() {
    const q = query.toLowerCase();
    view = [];
    for (let i = 0; i < lines.length; i++) {
      if (filter === 'err' && levels[i] !== 'err' && levels[i] !== 'trace-err') continue;
      if (filter === 'warn' && levels[i] !== 'warn') continue;
      if (q && lines[i].toLowerCase().indexOf(q) === -1) continue;
      view.push(i);
    }
    els.space.style.height = Math.max(view.length * LINE_H, LINE_H) + 'px';
    els.log.scrollTop = 0;
    paint();
  }

  function highlight(target, textLine) {
    if (!query) {
      target.textContent = textLine || ' ';
      return;
    }
    const low = textLine.toLowerCase();
    const q = query.toLowerCase();
    let pos = 0;
    let i = low.indexOf(q);
    while (i !== -1) {
      target.appendChild(document.createTextNode(textLine.slice(pos, i)));
      target.appendChild(el('mark', '', textLine.slice(i, i + q.length)));
      pos = i + q.length;
      i = low.indexOf(q, pos);
    }
    target.appendChild(document.createTextNode(textLine.slice(pos) || (pos ? '' : ' ')));
  }

  function paint() {
    const top = els.log.scrollTop;
    const h = els.log.clientHeight || 520;
    const from = Math.max(0, Math.floor(top / LINE_H) - 20);
    const to = Math.min(view.length, Math.ceil((top + h) / LINE_H) + 20);
    els.space.innerHTML = '';
    if (!view.length) {
      els.space.appendChild(el('div', 'la-empty', query ? 'No lines match “' + query + '”.' : 'No lines to show.'));
      return;
    }
    const frag = document.createDocumentFragment();
    for (let k = from; k < to; k++) {
      const i = view[k];
      const row = el('div', 'la-line' + (levels[i] ? ' is-' + levels[i] : '') + (i === flashLine ? ' is-flash' : ''));
      row.style.top = k * LINE_H + 'px';
      row.appendChild(el('span', 'la-no', String(i + 1)));
      const t = el('span', 'la-text');
      highlight(t, lines[i]);
      row.appendChild(t);
      frag.appendChild(row);
    }
    els.space.appendChild(frag);
  }

  function jumpTo(line) {
    if (filter !== 'all' || query) {
      filter = 'all';
      query = '';
      els.search.value = '';
      syncChips();
      rebuildView();
    }
    flashLine = line;
    const k = view.indexOf(line);
    els.log.scrollIntoView({ behavior: 'smooth', block: 'center' });
    els.log.scrollTop = Math.max(0, k * LINE_H - els.log.clientHeight / 3);
    paint();
    setTimeout(function () {
      flashLine = -1;
      paint();
    }, 2200);
  }

  function readFile(file) {
    showError('');
    if (!file) return;
    if (file.size > MAX_BYTES) return showError('That file is larger than 25 MB. Open it and paste the part around the crash instead.');
    const gz = /\.gz$/i.test(file.name);
    if (gz && typeof DecompressionStream === 'undefined') return showError('Your browser cannot open .gz files. Extract the file first.');
    const p = gz ? new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text() : file.text();
    p.then(function (text) {
      if (/[\u0000-\u0008]/.test(text.slice(0, 2000))) return showError("This doesn't look like a text log. Pick a .log or .txt file.");
      if (!text.trim()) return showError('The file is empty.');
      analyze(text, file.name);
    }).catch(function () { showError("We couldn't read this file. Try pasting the text instead."); });
  }

  els.file.addEventListener('change', function () {
    readFile(els.file.files[0]);
    els.file.value = '';
  });
  ['dragenter', 'dragover'].forEach(function (t) {
    els.drop.addEventListener(t, function (e) {
      e.preventDefault();
      els.drop.classList.add('is-over');
    });
  });
  ['dragleave', 'drop'].forEach(function (t) {
    els.drop.addEventListener(t, function (e) {
      e.preventDefault();
      els.drop.classList.remove('is-over');
    });
  });
  els.drop.addEventListener('drop', function (e) { readFile(e.dataTransfer.files[0]); });
  els.paste.addEventListener('input', function () { els.analyze.disabled = !els.paste.value.trim(); });
  els.analyze.addEventListener('click', function () {
    showError('');
    if (els.paste.value.trim()) analyze(els.paste.value, 'Pasted log');
  });
  els.sample.addEventListener('click', function () {
    showError('');
    analyze(SAMPLE, 'example-latest.log');
  });
  document.getElementById('laReset').addEventListener('click', function () {
    els.results.hidden = true;
    els.input.hidden = false;
    els.paste.value = '';
    els.analyze.disabled = true;
    lines = [];
    view = [];
  });
  document.querySelectorAll('.la-chip').forEach(function (c) {
    c.addEventListener('click', function () {
      filter = c.dataset.filter;
      syncChips();
      rebuildView();
    });
  });
  let searchTimer = null;
  els.search.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      query = els.search.value.trim();
      rebuildView();
    }, 150);
  });
  let raf = 0;
  els.log.addEventListener('scroll', function () {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      paint();
    });
  });
  window.addEventListener('resize', paint);

  const SAMPLE = [
    '[14:02:11] [main/INFO]: Loading Minecraft 1.21.4 with Fabric Loader 0.16.10',
    '[14:02:11] [main/INFO]: Loading 27 mods:',
    '\t- fabric-api 0.119.2+1.21.4',
    '\t- fabricloader 0.16.10',
    '\t- iris 1.8.8+mc1.21.4',
    '\t- java 21',
    '\t- minecraft 1.21.4',
    '\t- modmenu 13.0.3',
    '\t- sodium 0.6.13+mc1.21.4',
    '\t- zoomify 2.14.2+1.21.4',
    '[14:02:12] [main/WARN]: Mixin config ferritecore.predicates.mixin.json does not specify "minVersion" property',
    '[14:02:12] [main/INFO]: SpongePowered MIXIN Subsystem Version=0.8.7 Source=union:/C:/Users/Steve/AppData/Roaming/.minecraft/libraries/net/fabricmc/sponge-mixin/0.15.4+mixin.0.8.7/sponge-mixin-0.15.4+mixin.0.8.7.jar Service=Knot/Fabric Env=CLIENT',
    '[14:02:13] [main/ERROR]: Incompatible mods found!',
    'net.fabricmc.loader.impl.FormattedException: Some of your mods are incompatible with the game or each other!',
    'A potential solution has been determined, this may resolve your problem:',
    '\t - Install yet_another_config_lib_v3, version 3.6.0 or later.',
    'More details:',
    "\t - Mod 'Zoomify' (zoomify) 2.14.2+1.21.4 requires version 3.6.0 or later of mod 'YetAnotherConfigLib' (yet_another_config_lib_v3), which is missing!",
    '\tat net.fabricmc.loader.impl.FormattedException.ofLocalized(FormattedException.java:51)',
    '\tat net.fabricmc.loader.impl.FabricLoaderImpl.load(FabricLoaderImpl.java:199)',
    '\tat net.fabricmc.loader.impl.launch.knot.Knot.init(Knot.java:146)',
    '\tat net.fabricmc.loader.impl.launch.knot.KnotClient.main(KnotClient.java:23)'
  ].join('\n');
})();
