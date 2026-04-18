import machine

class FSR:
    def __init__(self, pin_number, r_fixed=10000):
        self.adc = machine.ADC(pin_number)
        self.vref = 3.3
        self.r_fixed = r_fixed

    def read_raw(self):
        return self.adc.read_u16()

    def read_voltage(self):
        return (self.read_raw() / 65535) * self.vref

    def read_resistance(self):
        v = self.read_voltage()

        # avoid divide-by-zero
        if v <= 0.01:
            return float("inf")

        return self.r_fixed * (self.vref / v - 1)

    def get_pressure_percentage(self):
        r = self.read_resistance()

        # Map expected range:
        # no press ~ inf
        # light press ~ 300k
        # hard press ~ 10k

        if r == float("inf"):
            return 0

        # clamp
        r = min(max(r, 10000), 300000)

        # invert (lower resistance = more pressure)
        percent = (300000 - r) / (300000 - 10000) * 100
        return percent