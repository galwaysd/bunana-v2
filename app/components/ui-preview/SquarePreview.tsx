import Image from "next/image";
import styles from "../../ui-preview/ui-preview.module.css";

const cards = [
  { name: "210D 牛津布", use: "户外背包", params: ["涤纶", "耐磨", "150 CM"] },
  { name: "190T 涤塔夫", use: "雨伞", params: ["PU 涂层", "防水", "轻量"] },
  { name: "春亚纺", use: "服装", params: ["涤纶", "平纹", "柔软"] },
  { name: "尼丝纺", use: "户外服装", params: ["防泼水", "轻薄", "细密"] }
];

export default function SquarePreview() {
  return (
    <section id="preview-04" className={`${styles.previewSection} ${styles.squareSection}`}>
      <div className={`${styles.sectionFrame} ${styles.squareFrame}`}>
        <header className={styles.squareHeader}>
          <div className={styles.squareTitle}>
            <p className={styles.eyebrow}>#04 / FABRIC SQUARE</p>
            <h2>最近发布的面料需求</h2>
          </div>
          <div className={styles.squareAside}>
            <p>按 Fabric DNA 字段查看与匹配，连接采购需求与布料供应。</p>
            <a href="/square">进入广场 →</a>
          </div>
        </header>

        <div className={styles.squareGrid}>
          {cards.map((card, index) => (
            <article className={styles.squareCard} key={card.name}>
              <div className={`${styles.cardTexture} ${styles[`texture_${index + 1}`]}`}>
                <Image
                  src="/ui-preview/fabric-surface.png"
                  alt=""
                  fill
                  sizes="(max-width: 760px) 100vw, 25vw"
                />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className={styles.cardBody}>
                <h3>{card.name}</h3>
                <p>{card.use}</p>
                <ul>
                  {card.params.map((param) => <li key={param}>{param}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
