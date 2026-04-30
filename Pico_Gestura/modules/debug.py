import time


TRUE_VALUES = ("1", "true", "yes", "on")


def env_flag(env, key, default=False):
    value = str(env.get(key, "")).strip().lower()
    if not value:
        return default
    return value in TRUE_VALUES


def env_list(env, key):
    value = str(env.get(key, "")).strip().lower()
    if not value:
        return []
    return [item.strip() for item in value.replace(";", ",").split(",") if item.strip()]


def env_int(env, key, default):
    try:
        return int(env.get(key, str(default)))
    except (TypeError, ValueError):
        return default


class DebugConfig:
    def __init__(self, env):
        self.enabled = env_flag(env, "DEBUG", False)
        self.targets = env_list(env, "DEBUG_LIST")
        self.interval_ms = env_int(env, "DEBUG_INTERVAL_MS", 500)

    def enabled_for(self, target):
        if not self.enabled:
            return False
        if not self.targets:
            return True
        return "all" in self.targets or target.lower() in self.targets


class DebugPrinter:
    def __init__(self, config, target):
        self.config = config
        self.target = target
        self.last_print_ms = 0

    def should_print(self):
        if not self.enabled():
            return False
        now = time.ticks_ms()
        if time.ticks_diff(now, self.last_print_ms) < self.config.interval_ms:
            return False
        self.last_print_ms = now
        return True

    def enabled(self):
        return bool(self.config and self.config.enabled_for(self.target))
