import Image from "next/image";
import styles from "../../ui-preview/ui-preview.module.css";

export default function HeroPreview() {
  return (
    <section id="preview-00" className={`${styles.previewSection} ${styles.heroSection}`}>
      <div className={`${styles.sectionFrame} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>#00 / FABRIC INTELLIGENCE</p>
          <h1>BUNANA</h1>
          <p className={styles.heroTagline}>一句话，找到你的布。</p>
          <a className={styles.primaryAction} href="#preview-02">开始识布</a>
        </div>

        <div className={styles.loomStage}>
          <Image
            src="/ui-preview/loom-line-art.png"
            alt="无人物的白色线稿织布机"
            width={1536}
            height={1024}
            priority
            className={styles.loomImage}
          />
        </div>

        <p className={styles.heroNote}>IMAGE / TEXT<br />TO FABRIC DNA</p>
      </div>
    </section>
  );
}
