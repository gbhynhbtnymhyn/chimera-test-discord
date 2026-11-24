(function () {
  const DEFAULTS = {
    backgroundUrl: "",
    opacity: 0.35,
    blur: 0,
    scale: 1,
    positionX: 50,
    positionY: 50,
    backgroundColor: "#090909",
    accentColor: "#b5121b",
    enabled: true
  };

  let api;
  let state = { ...DEFAULTS };
  let logs = [];
  let React;
  let RN;

  const log = (message) => {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`;
    logs = [line, ...logs].slice(0, 30);
    try { api?.plugin?.storage?.set?.("logs", logs); } catch (_) {}
  };

  const readState = () => {
    try {
      const saved = api?.plugin?.storage?.get?.("settings");
      if (saved && typeof saved === "object") state = { ...DEFAULTS, ...saved };
      const savedLogs = api?.plugin?.storage?.get?.("logs");
      if (Array.isArray(savedLogs)) logs = savedLogs;
    } catch (e) {
      log(`Storage read issue: ${String(e)}`);
    }
  };

  const save = (patch) => {
    state = { ...state, ...patch };
    try {
      api?.plugin?.storage?.set?.("settings", state);
      log("Settings saved");
    } catch (e) {
      log(`Could not save settings: ${String(e)}`);
    }
  };

  const h = (type, props, ...children) => React.createElement(type, props, ...children);
  const text = (value, style = {}) => h(RN.Text, {
    style: [{ color: "#f4f4f4", fontSize: 14 }, style]
  }, String(value));

  const section = (title, children) => h(RN.View, {
    style: { marginTop: 18, padding: 14, backgroundColor: "#171717", borderRadius: 12, borderWidth: 1, borderColor: "#333" }
  }, text(title, { color: "#ff525b", fontSize: 16, fontWeight: "700", marginBottom: 10 }), children);

  const button = (label, onPress, secondary = false) => h(RN.TouchableOpacity, {
    onPress,
    style: {
      paddingVertical: 11, paddingHorizontal: 13, borderRadius: 9, marginTop: 8,
      backgroundColor: secondary ? "#292929" : "#a70f19", alignItems: "center"
    }
  }, text(label, { fontWeight: "700" }));

  const field = (label, value, onChange, placeholder = "") => h(RN.View, { style: { marginBottom: 12 } },
    text(label, { marginBottom: 6, color: "#ddd" }),
    h(RN.TextInput, {
      value: String(value ?? ""),
      onChangeText: onChange,
      placeholder,
      placeholderTextColor: "#888",
      autoCapitalize: "none",
      style: { color: "#fff", backgroundColor: "#0c0c0c", borderColor: "#444", borderWidth: 1, borderRadius: 8, padding: 10 }
    })
  );

  const slider = (label, value, min, max, step, onChange) => h(RN.View, { style: { marginBottom: 14 } },
    text(`${label}: ${value}`, { marginBottom: 5 }),
    h(RN.Slider || RN.View, {
      value, minimumValue: min, maximumValue: max, step,
      onValueChange: onChange,
      minimumTrackTintColor: "#c21b27",
      maximumTrackTintColor: "#555",
      thumbTintColor: "#fff"
    })
  );

  const exportConfig = () => {
    const payload = JSON.stringify({ plugin: "Examination Tools", version: 1, settings: state }, null, 2);
    try {
      RN.Share?.share?.({ message: payload, title: "Examination Tools config" });
      log("Export requested");
    } catch (_) {
      RN.Alert?.alert?.("Your configuration", payload);
    }
  };

  const importConfig = () => {
    RN.Alert?.prompt?.(
      "Import configuration",
      "Paste a previously exported Examination Tools JSON config.",
      (value) => {
        try {
          const parsed = JSON.parse(value);
          if (!parsed || typeof parsed !== "object" || !parsed.settings) throw new Error("Missing settings object");
          save({ ...DEFAULTS, ...parsed.settings });
          log("Configuration imported");
          RN.Alert?.alert?.("Imported", "Configuration loaded.");
        } catch (e) {
          RN.Alert?.alert?.("Import failed", String(e));
        }
      },
      "plain-text"
    );
  };

  function Settings() {
    const [, refresh] = React.useState(0);
    const update = (patch) => { save(patch); refresh(x => x + 1); };
    const previewStyle = {
      height: 130, borderRadius: 10, overflow: "hidden",
      backgroundColor: state.backgroundColor,
      borderWidth: 1, borderColor: state.accentColor,
      justifyContent: "flex-end", padding: 12
    };
    return h(RN.ScrollView, {
      style: { flex: 1, backgroundColor: "#090909" },
      contentContainerStyle: { padding: 16, paddingBottom: 40 }
    },
      text("EXAMINATION TOOLS", { fontSize: 21, fontWeight: "900", color: "#ff424d" }),
      text("Created by Iloveexamination", { color: "#aaa", marginTop: 4 }),
      section("Live preview", h(RN.View, { style: previewStyle },
        text("EXAMINATION", { color: state.accentColor, fontWeight: "900", fontSize: 18 }),
        text("Red / black theme preview", { color: "#fff" })
      )),
      section("Background", h(RN.View, null,
        field("Background image URL", state.backgroundUrl, v => update({ backgroundUrl: v }), "https://..."),
        text("Image URL is saved here. Applying it across Discord requires a compatible Kettu background hook.", { color: "#aaa", fontSize: 12, marginBottom: 8 }),
        slider("Opacity", state.opacity, 0, 1, 0.05, v => update({ opacity: v })),
        slider("Blur", state.blur, 0, 20, 1, v => update({ blur: v })),
        slider("Scale", state.scale, 0.5, 2, 0.05, v => update({ scale: v })),
        slider("Horizontal position", state.positionX, 0, 100, 1, v => update({ positionX: v })),
        slider("Vertical position", state.positionY, 0, 100, 1, v => update({ positionY: v }))
      )),
      section("Colour editor", h(RN.View, null,
        field("Background colour (hex)", state.backgroundColor, v => update({ backgroundColor: v })),
        field("Accent colour (hex)", state.accentColor, v => update({ accentColor: v }))
      )),
      section("Developer tools", h(RN.View, null,
        text(`Plugin status: ${state.enabled ? "Enabled" : "Disabled"}`, { color: "#9ee6a0" }),
        text(`Saved background: ${state.backgroundUrl ? "URL set" : "No URL set"}`, { color: "#bbb", marginTop: 5 }),
        button("Export configuration", exportConfig, true),
        button("Import configuration", importConfig, true),
        button("View debug log", () => RN.Alert?.alert?.("Debug log", logs.join("\n") || "No log entries yet."), true),
        button("Reset settings", () => RN.Alert?.alert?.("Reset settings?", "Restore default values?", [
          { text: "Cancel", style: "cancel" },
          { text: "Reset", style: "destructive", onPress: () => { state = { ...DEFAULTS }; save(state); refresh(x => x + 1); log("Settings reset"); } }
        ]), true)
      )),
      text("Note: this starter provides the settings panel and saved configuration. Full Discord-wide background injection still needs testing against your exact Kettu build.", { color: "#888", fontSize: 12, marginTop: 16 })
    );
  }

  return function (vendetta) {
    api = vendetta || {};
    try {
      const common = api.metro?.common || {};
      React = common.React || api.React || globalThis.React;
      RN = common.ReactNative || api.ReactNative || globalThis.ReactNative;
      if (!React || !RN) throw new Error("React Native modules were not found");
      readState();
      log("Examination Tools loaded");
      return {
        onLoad() { log("Plugin enabled"); },
        onUnload() { log("Plugin disabled"); },
        settings: React.createElement(Settings)
      };
    } catch (e) {
      console.error("[Examination Tools]", e);
      return { onLoad() {}, onUnload() {} };
    }
  };
})()
