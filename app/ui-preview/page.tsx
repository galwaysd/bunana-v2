import {
  BunanaTheme,
  EditorialSection,
  EditorialHeading,
  WorkbenchPanel,
  QuestionPanel,
  FabricDnaPanel,
} from "@/app/ui-system";
import type { StatusMarkVariant } from "@/app/ui-system/StatusMark";

import HeroPreview from "@/app/components/ui-preview/HeroPreview";
import SquarePreview from "@/app/components/ui-preview/SquarePreview";

export default function UiPreviewPage() {
  // ── Workbench (02) data ──
  const workbenchEyebrow = "#02 / WORKBENCH";
  const workbenchHeading = "读懂 一块布";
  const workbenchDescription = "上传布样或描述需求。缺少什么，AI 只问一题。";

  // ── Fabric DNA (03) data ──
  const dnaFields: Array<{
    label: string;
    value: string;
    status: StatusMarkVariant;
  }> = [
    { label: "成分", value: "涤纶", status: "inferred" },
    { label: "织法", value: "牛津", status: "identified" },
    { label: "克重", value: "—", status: "missing" },
    { label: "幅宽", value: "150 cm", status: "confirmed" },
    { label: "涂层", value: "PU 涂层", status: "identified" },
    { label: "防水", value: "待确认", status: "missing" },
    { label: "起订量", value: "—", status: "missing" },
    { label: "交期", value: "加急", status: "identified" },
    { label: "颜色", value: "参考图片", status: "inferred" },
    { label: "特性", value: "耐磨", status: "confirmed" },
  ];

  const dnaIdentity = [
    { label: "面料名称", value: "210D 牛津布", status: "identified" as const },
    { label: "用途", value: "户外背包", status: "confirmed" as const },
  ];

  const statusLegend = [
    { status: "confirmed" as const, label: "已确认" },
    { status: "identified" as const, label: "已识别" },
    { status: "inferred" as const, label: "推测" },
    { status: "missing" as const, label: "缺失" },
  ];

  const footerCounts = [
    { label: "已确认", count: 3 },
    { label: "已识别", count: 3 },
    { label: "推测", count: 2 },
    { label: "缺失", count: 3 },
  ];

  // ── Question panel data ──
  const questionOptions = [
    { label: "户外背包", value: "户外背包" },
    { label: "雨伞", value: "雨伞" },
    { label: "服装", value: "服装" },
  ];

  return (
    <BunanaTheme>
      {/* 00 Hero — unchanged, uses legacy preview component */}
      <HeroPreview />

      {/* 02 Workbench — migrated to ui-system */}
      <EditorialSection
        id="preview-02"
        variant="workbench"
        surface="brand"
        fitViewport
        eyebrow={workbenchEyebrow}
        heading={
          <EditorialHeading tag="h2" size="h2" weight="medium">
            读懂 一块布
          </EditorialHeading>
        }
        description={workbenchDescription}
      >
        <div className="workbench-layout">
          <WorkbenchPanel
            density="compact"
            eyebrow="INPUT CHANNEL"
            label="01—02"
            uploadPrompt="上传布料照片"
            uploadHint="拖入或选择 1–3 张 · JPG / PNG"
            defaultText="雨伞用防水布，190T 涤塔夫，PU 涂层。"
            charCount="24 / 1200"
            note="图片和文字至少填一项"
            actionLabel="开始织卡"
            actionTrailing="WEAVE →"
          />
          <QuestionPanel
            variant="choice"
            density="compact"
            eyebrow="AI / CURRENT QUESTION"
            fieldLabel="用途"
            question="这块布最终用于什么产品或场景？"
            options={questionOptions}
            showUncertain={true}
            placeholder="输入你的回答…"
            submitLabel="确认织入"
            progress={{ current: 1, total: 1 }}
            missingField="用途"
          />
        </div>
      </EditorialSection>

      {/* 03 Fabric DNA — migrated to ui-system */}
      <EditorialSection
        id="preview-03"
        variant="dna"
        surface="paper"
        fitViewport
        eyebrow="#03 / FABRIC DNA"
        heading={
          <EditorialHeading tag="h2" size="display" weight="medium" subtitle="身份证">
            织物
          </EditorialHeading>
        }
      >
        <FabricDnaPanel
          variant="archive"
          density="compact"
          cardId="NO. 00210D"
          title="FABRIC DNA / IDENTITY ARCHIVE"
          identity={dnaIdentity}
          fields={dnaFields}
          footer={footerCounts}
          swatchImage={{
            src: "/ui-preview/fabric-surface.png",
            alt: "黄色与白色交织的布样纹理",
            label: "SWATCH / 210D",
          }}
          statusLegend={statusLegend}
          showLegend={true}
        />
      </EditorialSection>

      {/* 04 Square — unchanged, uses legacy preview component */}
      <SquarePreview />
    </BunanaTheme>
  );
}
