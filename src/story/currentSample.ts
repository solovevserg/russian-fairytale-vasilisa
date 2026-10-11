import { createSample } from "./timeline";

/** Текущее (сглаженное) состояние таймлайна. Пишет CameraRig, читают звук и эффекты. */
export const currentSample = createSample();

/** Прогресс, по которому сейчас стоит сцена (с учётом медленных переходов). */
export const sceneProgress = { value: 0 };
