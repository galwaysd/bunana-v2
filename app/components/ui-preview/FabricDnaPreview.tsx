import Image from "next/image";
import styles from "../../ui-preview/ui-preview.module.css";

type Status = "confirmed" | "identified" | "inferred" | "missing";

const statusLabels: Record<Status, string> = {
  confirmed: "已确认",
  identified: "已识别",
  inferred: "推测",
  missing: "缺失"
};

const fields: Array<{ label: string; value: string; status: Status }> = [
  { label: "成分", value: "涤纶", status: "inferred" },
  { label: "织法", value: "牛津", status: "identified" },
  { label: "克重", value: "—", status: "missing" },
  { label: "幅宽", value: "150 cm", status: "confirmed" },
  { label: "涂层", value: "PU 涂层", status: "identified" },
  { label: "防水", value: "待确认", status: "missing" },
  { label: "起订量", value: "—", status: "missing" },
  { label: "交期", value: "加急", status: "identified" },
  { label: "颜色", value: "参考图片", status: "inferred" },
  { label: "特性", value: "耐磨", status: "confirmed" }
];

function StatusDot({ status }: { status: Status }) {
  return (
    <span
      className={`${styles.statusDot} ${styles[`status_${status}`]}`}
      title={statusLabels[status]}
      aria-label={statusLabels[status]}
    />
  );
}

export default function FabricDnaPreview() {
  return (
    <section id="preview-03" className={`${styles.previewSection} ${styles.dnaSection}`}>
      <div className={`${styles.sectionFrame} ${styles.dnaGrid}`}>
        <header className={styles.dnaIntro}>
          <p className={styles.eyebrow}>#03 / FABRIC DNA</p>
          <h2><span>织物</span><span>身份证</span></h2>

          <div className={styles.fabricSwatch}>
            <Image
              src="/ui-preview/fabric-surface.png"
              alt="黄色与白色交织的布样纹理"
              fill
              sizes="(max-width: 760px) 100vw, 34vw"
            />
            <span>SWATCH / 210D</span>
          </div>

          <div className={styles.statusLegend} aria-label="Fabric DNA 状态图例">
            {(Object.keys(statusLabels) as Status[]).map((status) => (
              <div key={status}>
                <StatusDot status={status} />
                <span>{statusLabels[status]}</span>
              </div>
            ))}
          </div>
        </header>

        <article className={styles.dnaCard}>
          <header className={styles.dnaCardHeader}>
            <strong>FABRIC DNA / IDENTITY ARCHIVE</strong>
            <span>NO. 00210D</span>
          </header>

          <div className={styles.dnaIdentity}>
            <div>
              <span>面料名称</span>
              <strong>210D 牛津布</strong>
              <StatusDot status="identified" />
            </div>
            <div>
              <span>用途</span>
              <strong>户外背包</strong>
              <StatusDot status="confirmed" />
            </div>
          </div>

          <div className={styles.dnaFields}>
            {fields.map((field) => (
              <div className={styles.dnaField} key={field.label}>
                <span>{field.label}</span>
                <strong>{field.value}</strong>
                <StatusDot status={field.status} />
              </div>
            ))}
          </div>

          <footer className={styles.dnaCardFooter}>
            <span>已确认 3</span>
            <span>已识别 3</span>
            <span>推测 2</span>
            <span>缺失 3</span>
          </footer>
        </article>
      </div>
    </section>
  );
}
