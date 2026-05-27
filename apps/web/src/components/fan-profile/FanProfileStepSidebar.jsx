import { FAN_PROFILE_STEPS, clampFanProfileStepIndex } from '@/data/fanProfileSteps'

export default function FanProfileStepSidebar({ stepIndex, onStepChange }) {
  const safeStepIndex = clampFanProfileStepIndex(stepIndex)
  return (
    <nav className="fan-profile-sidebar" aria-label="Profile steps">
      <p className="fan-profile-sidebar__heading">Steps</p>
      <ol className="fan-profile-sidebar__list">
        {FAN_PROFILE_STEPS.map((s, i) => {
          const done = i < safeStepIndex
          const current = i === safeStepIndex
          const isLast = i === FAN_PROFILE_STEPS.length - 1

          return (
            <li
              key={s.id}
              className={`fan-profile-sidebar__item ${
                current ? 'fan-profile-sidebar__item--current' : ''
              } ${done ? 'fan-profile-sidebar__item--done' : ''}`}
            >
              <div className="fan-profile-sidebar__rail" aria-hidden="true">
                <span
                  className={`fan-profile-sidebar__dot ${
                    current ? 'fan-profile-sidebar__dot--current' : ''
                  } ${done ? 'fan-profile-sidebar__dot--done' : ''}`}
                >
                  {done ? '✓' : i + 1}
                </span>
                {!isLast && <span className="fan-profile-sidebar__line" />}
              </div>

              <button
                type="button"
                className="fan-profile-sidebar__step"
                aria-current={current ? 'step' : undefined}
                onClick={() => onStepChange(i)}
              >
                <span className="fan-profile-sidebar__title">{s.title}</span>
                <span className="fan-profile-sidebar__desc">{s.description}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
