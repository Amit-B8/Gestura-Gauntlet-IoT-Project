import machine

class MPU6050:
    def __init__(self, i2c, addr=0x68):
        self.i2c = i2c
        self.addr = addr
        
        # 1. Wake up the MPU-6050 
        # (It starts in sleep mode to save power. Register 0x6B controls power management)
        self.i2c.writeto_mem(self.addr, 0x6B, b'\x00')

    def get_accel(self):
        # 2. Read 6 bytes of accelerometer data starting from register 0x3B
        # This grabs High and Low bytes for X, Y, and Z all at once
        data = self.i2c.readfrom_mem(self.addr, 0x3B, 6)
        
        # 3. Combine the High and Low bytes
        x = self._bytes_to_int(data[0], data[1])
        y = self._bytes_to_int(data[2], data[3])
        z = self._bytes_to_int(data[4], data[5])
        
        # 4. Convert raw data to standard G-forces 
        # (The default +/- 2g range has a scale factor of 16384)
        return {
            'x': x / 16384.0, 
            'y': y / 16384.0, 
            'z': z / 16384.0
        }

    def _bytes_to_int(self, msb, lsb):
        # Bitwise shift to combine the two 8-bit numbers into a 16-bit number
        val = (msb << 8) | lsb
        
        # Handle Two's Complement for negative numbers
        if val >= 32768:
            val -= 65536
        return val