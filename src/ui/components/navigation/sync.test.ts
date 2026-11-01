import moment from "moment";
import { beforeEach, describe, expect, it } from "vitest";
import type { IGranularity } from "@/io/types";
import { NavigationSync, type NavigationMountProps } from "./sync";

// Which breadcrumbs and mini calendar each tab (leaf) shows, kept apart from Obsidian (docs/adr/0017). Tabs, their notes and
// mounting are stand-ins: a "component" records the props it was mounted with and whether it was unmounted.

type Leaf = { name: string };
type Component = { leaf: string; props: NavigationMountProps; unmounted: boolean };
type Note = { path: string; basename: string };

const note = (path: string): Note => ({ path, basename: path.slice(path.lastIndexOf("/") + 1, -3) });
// periodic notes in these tests: daily notes named YYYY-MM-DD and monthly notes named YYYY-MM
// the formats can change, as when the settings change
let formats: [IGranularity, string][];
const read = (file: Note) => {
    for (const [granularity, format] of formats) {
        const date = moment(file.basename, format, true);
        if (date.isValid()) return { isPeriodic: true, granularity, date };
    }
    return { isPeriodic: false, granularity: null, date: null };
};

const settings = { periodic: true, other: false };

describe("NavigationSync: タブごとに、そのタブのノートのパンくずとミニカレンダーを出す", () => {
    let mounted: Component[];
    let sync: NavigationSync<Leaf, Component, Note>;
    let leaves: Map<string, Leaf>;
    // tabs are objects like Obsidian's leaves, one per name; a tab shows a note in a container, named after the tab
    // unless a test says otherwise
    const leaf = (name: string) => leaves.get(name) ?? leaves.set(name, { name }).get(name)!;
    const tab = (name: string, file: Note | null, target: unknown = name) => ({ leaf: leaf(name), target, file });
    const live = () => mounted.filter((c) => !c.unmounted);

    beforeEach(() => {
        mounted = [];
        leaves = new Map();
        formats = [["day", "YYYY-MM-DD"], ["month", "YYYY-MM"]];
        sync = new NavigationSync<Leaf, Component, Note>({
            mount: (leaf, props) => {
                const component = { leaf: leaf.name, props, unmounted: false };
                mounted.push(component);
                return component;
            },
            unmount: (component) => (component.unmounted = true),
            read,
        });
    });

    it("周期ノートを開いているタブに、そのノートの周期と日付で出す", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
        expect(live()).toHaveLength(1);
        expect(live()[0].props.granularity).toBe("day");
        expect(live()[0].props.date!.format("YYYY-MM-DD")).toBe("2026-10-30");
        expect(live()[0].props.isPeriodic).toBe(true);
    });

    it("同じタブで同じノートのままなら、作り直さない（ミニカレンダーを動かした位置が残る）", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
        sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
        expect(mounted).toHaveLength(1);
        expect(live()).toHaveLength(1);
    });

    it("同じタブで別のノートを開いたら、前のものを外して付け替える", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
        sync.sync([tab("A", note("月/2026-10.md"))], settings);
        expect(mounted[0].unmounted).toBe(true);
        expect(live()).toHaveLength(1);
        expect(live()[0].props.granularity).toBe("month");
    });

    it("周期ノート → ふつうのノート → 同じ周期ノートと戻ると、また出る（不具合 (4)）", () => {
        sync.sync([tab("A", note("月/2026-10.md"))], settings);
        sync.sync([tab("A", note("メモ.md"))], settings);
        expect(live()).toHaveLength(0);
        sync.sync([tab("A", note("月/2026-10.md"))], settings);
        expect(live()).toHaveLength(1);
        expect(live()[0].props.granularity).toBe("month");
    });

    it("タブごとに別々に持つ。ほかのタブを開いても、そのタブのものは作り直さない", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md")), tab("B", note("月/2026-10.md"))], settings);
        expect(live().map((c) => c.leaf)).toEqual(["A", "B"]);
        sync.sync([tab("A", note("日記/2026-10-30.md")), tab("B", note("月/2026-11.md"))], settings);
        expect(mounted[0].unmounted).toBe(false);
        expect(live().map((c) => c.props.date!.format("YYYY-MM"))).toEqual(["2026-10", "2026-11"]);
    });

    it("同じノートを 2 つのタブで開けば、それぞれに出す", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md")), tab("B", note("日記/2026-10-30.md"))], settings);
        expect(live().map((c) => c.leaf)).toEqual(["A", "B"]);
    });

    it("閉じたタブのものは外す", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md")), tab("B", note("月/2026-10.md"))], settings);
        sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
        expect(live().map((c) => c.leaf)).toEqual(["A"]);
    });

    it("ノートのないタブ（空のタブ）からは外す", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
        sync.sync([tab("A", null)], settings);
        expect(live()).toHaveLength(0);
    });

    it("同じノートでも、付けた先の要素が替わっていれば付け直す（タブの中のビューが作り直されたとき）", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md"), "古い")], settings);
        sync.sync([tab("A", note("日記/2026-10-30.md"), "新しい")], settings);
        expect(mounted[0].unmounted).toBe(true);
        expect(live()).toHaveLength(1);
    });

    it("ノートの名前が変わったら、新しい名前で付け直す", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
        sync.sync([tab("A", note("日記/2026-10-31.md"))], settings);
        expect(live()[0].props.date!.format("YYYY-MM-DD")).toBe("2026-10-31");
    });

    describe("設定が変わって、同じノートの読み取り結果が変わったとき（書式・週の始まり・四半期と年の始まりの月）", () => {
        it("周期ノートでなくなったら、ふつうのノートとして付け直す", () => {
            const on = { ...settings, other: true };
            sync.sync([tab("A", note("日記/2026-10-30.md"))], on);
            formats = [["day", "DD.MM.YYYY"]];
            sync.sync([tab("A", note("日記/2026-10-30.md"))], on);
            expect(mounted[0].unmounted).toBe(true);
            expect(live()[0].props).toEqual({ isPeriodic: false, granularity: null, date: null });
        });

        it("ふつうのノートが周期ノートになったら、周期ノートとして付け直す", () => {
            const on = { ...settings, other: true };
            sync.sync([tab("A", note("日記/30.10.2026.md"))], on);
            formats = [["day", "DD.MM.YYYY"]];
            sync.sync([tab("A", note("日記/30.10.2026.md"))], on);
            expect(live()).toHaveLength(1);
            expect(live()[0].props.date!.format("YYYY-MM-DD")).toBe("2026-10-30");
        });

        it("別の日付・周期と読めるようになったら、付け直す", () => {
            sync.sync([tab("A", note("日記/2026-10.md"))], settings);
            formats = [["day", "YYYY-DD"]];
            sync.sync([tab("A", note("日記/2026-10.md"))], settings);
            expect(live()).toHaveLength(1);
            expect(live()[0].props.granularity).toBe("day");
        });

        it("同じ周期の別の日付と読めるようになったら、付け直す", () => {
            sync.sync([tab("A", note("日記/2026-10-11.md"))], settings);
            formats = [["day", "YYYY-DD-MM"]];
            sync.sync([tab("A", note("日記/2026-10-11.md"))], settings);
            expect(live()).toHaveLength(1);
            expect(live()[0].props.date!.format("YYYY-MM-DD")).toBe("2026-11-10");
        });

        it("読み取り結果が同じなら作り直さない（日付は別のオブジェクトでもよい）", () => {
            sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
            formats = [["day", "YYYY-MM-DD"]];
            sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
            expect(mounted).toHaveLength(1);
        });
    });

    describe("ふつうのノート", () => {
        it("「ふつうのノートにも出す」がオフなら出さない", () => {
            sync.sync([tab("A", note("メモ.md"))], settings);
            expect(live()).toHaveLength(0);
        });

        it("オンなら、周期ノートでないノートとして出す（今の位置は付けた先で求める）", () => {
            sync.sync([tab("A", note("メモ.md"))], { ...settings, other: true });
            expect(live()[0].props).toEqual({ isPeriodic: false, granularity: null, date: null });
        });

        it("ふつうのノートどうしで開き直したら、そのノートのものに付け替える", () => {
            const on = { ...settings, other: true };
            sync.sync([tab("A", note("メモ.md"))], on);
            sync.sync([tab("A", note("別のメモ.md"))], on);
            expect(mounted).toHaveLength(2);
            expect(live()).toHaveLength(1);
        });
    });

    it("周期ノートに出さない設定なら、周期ノートからも外す（出す場所を変えたとき）", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
        sync.sync([tab("A", note("日記/2026-10-30.md"))], { periodic: false, other: false });
        expect(live()).toHaveLength(0);
    });

    it("clear: 全部外す。次の sync で付け直す", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md")), tab("B", note("月/2026-10.md"))], settings);
        sync.clear();
        expect(live()).toHaveLength(0);
        sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
        expect(live()).toHaveLength(1);
    });
});
