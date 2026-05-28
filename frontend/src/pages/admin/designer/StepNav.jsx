import { Fragment } from "react";

export default function StepNav({ steps, activeStep, onStepChange }) {
  return (
    <nav className="step-nav" aria-label="ניווט שלבים">
      {steps.map((s, i) => {
        const isActive = s.id === activeStep;
        const isVisited = s.id < activeStep;
        const isReached = s.id <= activeStep;
        return (
          <Fragment key={s.id}>
            {i > 0 && (
              <span
                className={"step-nav__line" + (isReached ? " step-nav__line--filled" : "")}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              className={
                "step-nav__step" +
                (isActive ? " step-nav__step--active" : "") +
                (isVisited ? " step-nav__step--visited" : "")
              }
              onClick={() => onStepChange(s.id)}
              aria-current={isActive ? "step" : undefined}
              aria-label={s.label}
            >
              <span className="step-nav__circle">{s.id}</span>
              <span className="step-nav__label">{s.label}</span>
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
