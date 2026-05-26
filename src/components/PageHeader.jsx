import { motion } from 'framer-motion'
import styles from '../styles/GamePage.module.css'

export default function PageHeader({ emoji, title, description }) {
  return (
    <motion.header
      className={styles.header}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={styles.pageEmoji}>{emoji}</div>
      <h1 className={styles.pageTitle}>{title}</h1>
      <div className={styles.pageDesc}>{description}</div>
    </motion.header>
  )
}
