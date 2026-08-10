import styles from "../../ui-preview/ui-preview.module.css";

export default function WorkbenchPreview() {
  return (
    <section id="preview-02" className={`${styles.previewSection} ${styles.workbenchSection}`}>
      <div className={`${styles.sectionFrame} ${styles.workbenchGrid}`}>
        <header className={styles.workbenchIntro}>
          <p className={styles.eyebrow}>#02 / WORKBENCH</p>
          <h2>读懂<br />一块布</h2>
          <p>上传布样或描述需求。<br />缺少什么，AI 只问一题。</p>
        </header>

        <div className={styles.workbenchInput}>
          <div className={styles.inputHeading}>
            <span>INPUT CHANNEL</span>
            <span>01—02</span>
          </div>

          <div className={styles.inputStack}>
            <label className={styles.uploadZone} htmlFor="preview-fabric-upload">
              <span className={styles.uploadIndex}>01 / IMAGE</span>
              <span className={styles.uploadPrompt}>上传布料照片</span>
              <span>拖入或选择 1–3 张 · JPG / PNG</span>
            </label>
            <input
              id="preview-fabric-upload"
              className={styles.visuallyHidden}
              type="file"
              accept="image/*"
              multiple
            />

            <label className={styles.fieldLabel} htmlFor="preview-fabric-copy">
              02 / TEXT DESCRIPTION
            </label>
            <textarea
              id="preview-fabric-copy"
              className={styles.fabricTextarea}
              rows={4}
              maxLength={1200}
              defaultValue="雨伞用防水布，190T 涤塔夫，PU 涂层。"
              aria-describedby="preview-copy-note"
            />
            <div id="preview-copy-note" className={styles.inputNote}>
              <span>图片和文字至少填一项</span>
              <span>24 / 1200</span>
            </div>
          </div>

          <button className={styles.textAction} type="button">
            <span>开始织卡</span><span>WEAVE →</span>
          </button>
        </div>

        <div className={styles.questionArea}>
          <div className={styles.questionLabel}>
            <span>AI / CURRENT QUESTION</span>
            <span>用途</span>
          </div>
          <p className={styles.questionTitle}>这块布最终用于什么产品或场景？</p>
          <div className={styles.answerRow}>
            <input type="text" placeholder="输入你的回答…" aria-label="AI 追问回答" />
            <button type="button">确认织入</button>
          </div>
          <div className={styles.questionProgress}>
            <span>问题 01 / 01</span>
            <span>缺失字段 · 用途</span>
          </div>
        </div>
      </div>
    </section>
  );
}
