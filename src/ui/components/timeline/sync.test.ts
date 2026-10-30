import moment from "moment";
import { beforeEach, describe, expect, it } from "vitest";
import { TimelineSync, type TimelineMountProps } from "./sync";

// Which timeline each tab (leaf) shows, kept apart from Obsidian (docs/state.md, ADR-S3). Tabs, their notes and
// mounting are stand-ins: a "component" records the props it was mounted with and whether it was unmounted.

type Leaf = { name: string };
type Component = { leaf: string; props: TimelineMountProps; unmounted: boolean };
type Note = { path: string; basename: string };

const note = (path: string): Note => ({ path, basename: path.slice(path.lastIndexOf("/") + 1, -3) });
// periodic notes in these tests: daily notes named YYYY-MM-DD and monthly notes named YYYY-MM
const read = (file: Note) => {
    for (const [granularity, format] of [["day", "YYYY-MM-DD"], ["month", "YYYY-MM"]] as const) {
        const date = moment(file.basename, format, true);
        if (date.isValid()) return { isPeriodic: true, granularity, date };
    }
    return { isPeriodic: false, granularity: null, date: null };
};

const settings = { displayOnRestNotes: false, viewMode: "expanded" as const, restViewMode: "collapsed" as const };

describe("TimelineSync: タブごとに、そのタブのノートのタイムラインを出す", () => {
    let mounted: Component[];
    let sync: TimelineSync<Leaf, Component, Note>;
    let leaves: Map<string, Leaf>;
    // tabs are objects like Obsidian's leaves, one per name; a tab shows a note in a container, named after the tab
    // unless a test says otherwise
    const leaf = (name: string) => leaves.get(name) ?? leaves.set(name, { name }).get(name)!;
    const tab = (name: string, file: Note | null, target: unknown = name) => ({ leaf: leaf(name), target, file });
    const live = () => mounted.filter((c) => !c.unmounted);

    beforeEach(() => {
        mounted = [];
        leaves = new Map();
        sync = new TimelineSync<Leaf, Component, Note>({
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
        expect(live()[0].props.initialDate.format("YYYY-MM-DD")).toBe("2026-10-30");
        expect(live()[0].props.isPeriodic).toBe(true);
    });

    it("同じタブで同じノートのままなら、作り直さない（週の移動や開閉が残る）", () => {
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
        expect(live().map((c) => c.props.initialDate.format("YYYY-MM"))).toEqual(["2026-10", "2026-11"]);
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
        expect(live()[0].props.initialDate.format("YYYY-MM-DD")).toBe("2026-10-31");
    });

    describe("ふつうのノート", () => {
        it("「ふつうのノートにも出す」がオフなら出さない", () => {
            sync.sync([tab("A", note("メモ.md"))], settings);
            expect(live()).toHaveLength(0);
        });

        it("オンなら、今日の日次のタイムラインを出す", () => {
            sync.sync([tab("A", note("メモ.md"))], { ...settings, displayOnRestNotes: true });
            expect(live()[0].props.granularity).toBe("day");
            expect(live()[0].props.initialDate.isSame(moment(), "day")).toBe(true);
            expect(live()[0].props.isPeriodic).toBe(false);
        });

        it("ふつうのノートどうしで開き直したら、そのノートのものに付け替える", () => {
            const on = { ...settings, displayOnRestNotes: true };
            sync.sync([tab("A", note("メモ.md"))], on);
            sync.sync([tab("A", note("別のメモ.md"))], on);
            expect(mounted).toHaveLength(2);
            expect(live()).toHaveLength(1);
        });
    });

    describe("開閉の初期値（幅では決めない）", () => {
        it("周期ノートは設定の viewMode、ふつうのノートは restViewMode で始める", () => {
            sync.sync([tab("A", note("日記/2026-10-30.md")), tab("B", note("メモ.md"))], {
                ...settings,
                displayOnRestNotes: true,
            });
            expect(live().map((c) => c.props.viewModeOverride)).toEqual(["expanded", "collapsed"]);
        });

        it("そのタブで開閉を切り替えていれば、次に付けるときはそれで始める", () => {
            sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
            live()[0].props.onViewModeChange("collapsed");
            sync.sync([tab("A", note("日記/2026-10-31.md"))], settings);
            expect(live()[0].props.viewModeOverride).toBe("collapsed");
        });

        it("覚えるのはタブごと、周期ノートとふつうのノートで別々", () => {
            const on = { ...settings, displayOnRestNotes: true };
            sync.sync([tab("A", note("日記/2026-10-30.md")), tab("B", note("日記/2026-10-30.md"))], on);
            live()[0].props.onViewModeChange("collapsed");
            sync.sync([tab("A", note("メモ.md")), tab("B", note("日記/2026-10-31.md"))], on);
            expect(live().map((c) => c.props.viewModeOverride)).toEqual(["collapsed", "expanded"]);
            live()[0].props.onViewModeChange("expanded");
            sync.sync([tab("A", note("日記/2026-11-01.md")), tab("B", note("日記/2026-10-31.md"))], on);
            expect(live().find((c) => c.leaf === "A")!.props.viewModeOverride).toBe("collapsed");
        });
    });

    it("clear: 全部外す。次の sync で付け直す（設定を変えたとき）", () => {
        sync.sync([tab("A", note("日記/2026-10-30.md")), tab("B", note("月/2026-10.md"))], settings);
        sync.clear();
        expect(live()).toHaveLength(0);
        sync.sync([tab("A", note("日記/2026-10-30.md"))], settings);
        expect(live()).toHaveLength(1);
    });
});
