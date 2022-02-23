const helpers = require('../internal/HelperMethods.js');
const { execSync } = require("child_process");

module.exports = class Helpers {

    /**
     * Save the license as a string that can later be read by LoadFromString.
     * @param {object} licenseKey The license key object to serialize.
     */
    static SaveAsString(licenseKey) {
        if(licenseKey.RawResponse) {
            return JSON.stringify(licenseKey.RawResponse);
        }
        console.warn("The license key does not have a raw response field.");
        return null;
    }

    /**
     * Loads a license from a string generated by SaveAsString.
     * Note: if an error occurs, null will be returned. An error can occur
     * if the license string has been tampered with or if the public key is
     * incorrectly formatted.
     * @param {string} rsaPubKey The RSA Public key
     * @param {string} string
     * @param {number} SignatureExpirationInterval If the license key was signed,
     * this method will check so that no more than "signatureExpirationInterval"
     * days have passed since the last activation.
     */
    static LoadFromString(rsaPubKey, string, signatureExpirationInterval = 0) {
        var response = JSON.parse(string);

        if(helpers.VerifySignature(response, rsaPubKey)){
            var licenseKey = JSON.parse(Buffer.from(response.licenseKey,'base64').toString("utf-8"));
            var signed = new Date(licenseKey.SignDate*1000);
            var exp = new Date(signed.getFullYear(),signed.getMonth(),signed.getDate()+signatureExpirationInterval);
            if(signatureExpirationInterval > 0 && new Date() > exp) {
                console.warn("The license has expired.");
                return null;
            }
            licenseKey.RawResponse = response;
            return licenseKey;
        }
        return null;
    }


    /**
     * Returns a machine code of the current device.
     */
     static GetMachineCode_beta() {

        if (process.platform === "win32") {
					return execSync('cmd.exe /C wmic csproduct get uuid', {encoding: 'utf8'});
        } else if (process.platform === "linux") {
            return execSync("dmidecode -s system-uuid", {encoding: 'utf8'});
        } else if (process.platform === "darwin") {
            return execSync("system_profiler SPHardwareDataType | awk '/UUID/ { print $3; }'", {encoding: 'utf8'});
        }
        
        return null;
    }

		/**
     * Check if the current license has expired.
     * @param licenseKey a license key object.
     * @return True if it has expired and false otherwise.
     */
		 static HasExpired(licenseKey) {

			if(licenseKey == null) {
					return false;
			}
			
			let unixTime = new Date() / 1000;

			if (licenseKey.Expires < unixTime) {
					return true;
			}

			return false;
	}

	/**
	 * Check if the current license has not expired.
	 * @param licenseKey a license key object.
	 * @return True if it has not expired and false otherwise.
	 */
	static HasNotExpired(licenseKey) {
			return !Helpers.HasExpired(licenseKey);
	}

}