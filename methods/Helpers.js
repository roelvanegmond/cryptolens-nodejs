const helpers = require('../internal/HelperMethods.js');
const { execSync } = require("child_process");
var crypto = require('crypto');


module.exports = class Helpers {

    /**
     * Save the license as a string that can later be read by LoadFromString.
     * @param {object} licenseKey The license key object to serialize.
     */
    static SaveAsString(licenseKey) {
        if (licenseKey.RawResponse) {
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
        try {
            var response = JSON.parse(string);

            if (helpers.VerifySignature(response, rsaPubKey)) {
                var licenseKey = JSON.parse(Buffer.from(response.licenseKey, 'base64').toString("utf-8"));
                var signed = new Date(licenseKey.SignDate * 1000);
                var exp = new Date(signed.getFullYear(), signed.getMonth(), signed.getDate() + signatureExpirationInterval);
                if (signatureExpirationInterval > 0 && new Date() > exp) {
                    console.warn("The license has expired.");
                    return null;
                }
                licenseKey.RawResponse = response;
                return licenseKey;
            }
            return null;
        } catch (error) {
            return null;
        }
    }


    /**
     * Returns a machine code of the current device.
     */
    static GetMachineCode() {

        var res = "";

        if (process.platform === "win32") {
            res = (execSync('cmd /c powershell.exe -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"', { encoding: 'utf8' }));
            res = res.substring(res.indexOf("UUID")).trim();
        } else if (process.platform === "linux") {
            res = (execSync("findmnt", "--output=UUID --noheadings --target=/boot", { encoding: 'utf8' }));
        } else if (process.platform === "darwin") {
            res = (execSync("system_profiler SPHardwareDataType | awk '/UUID/ { print $3; }'", { encoding: 'utf8' }));
        }

        return crypto.createHash('sha256').update(res).digest('hex');
    }

    /**
     * Check if the current license has expired.
     * @param licenseKey a license key object.
     * @return True if it has expired and false otherwise.
     */
    static HasExpired(licenseKey) {
        if (licenseKey == null) {
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

    /**
     * Check if the license has a certain feature enabled (i.e. set to true).
     * @param licenseKey a license key object.
     * @param feature The feature, eg 1 to 8.
     * @return If the feature is set to true, true is returned and false otherwise.
     */
    static HasFeature(licenseKey, feature) {

        if (licenseKey == null) {
            return false;
        }

        if (feature == 1 && licenseKey.F1)
            return true;
        if (feature == 2 && licenseKey.F2)
            return true;
        if (feature == 3 && licenseKey.F3)
            return true;
        if (feature == 4 && licenseKey.F4)
            return true;
        if (feature == 5 && licenseKey.F5)
            return true;
        if (feature == 6 && licenseKey.F6)
            return true;
        if (feature == 7 && licenseKey.F7)
            return true;
        if (feature == 8 && licenseKey.F8)
            return true;

        return false;
    }

    /**
      * Check if the device is registered with the license key.
      * @param license The license key object.
      * @param machineCode The machine code of the current device.
      * @param isFloatingLicense If this is a floating license, this parameter has to be set to true.
      *                          You can enable floating licenses by setting @see ActivateModel.FloatingTimeInterval.
      * @param allowOverdraft If floating licensing is enabled with overdraft, this parameter should be set to true.
      *                       You can enable overdraft by setting ActivateModel.MaxOverdraft" to a value greater than 0.
      *
      * @return True if the license is registered with this machine and False otherwise.
      */
    static IsOnRightMachine(license, isFloatingLicense, allowOverdraft) {
        return this.IsOnRightMachine(license, Helpers.GetMachineCode(), isFloatingLicense, allowOverdraft);
    }

    /**
      * Check if the device is registered with the license key.
      * @param license The license key object.
      * @param machineCode The machine code of the current device.
      * @param isFloatingLicense If this is a floating license, this parameter has to be set to true.
      *                          You can enable floating licenses by setting @see ActivateModel.FloatingTimeInterval.
      * @param allowOverdraft If floating licensing is enabled with overdraft, this parameter should be set to true.
      *                       You can enable overdraft by setting ActivateModel.MaxOverdraft" to a value greater than 0.
      *
      * @return True if the license is registered with this machine and False otherwise.
      */
    static IsOnRightMachine(license, machineCode, isFloatingLicense, allowOverdraft) {

        if (license == null || license.ActivatedMachines == null) {
            return false;
        }

        if (isFloatingLicense) {
            license.ActivatedMachines.forEach(machine => {
                if (machine.Mid.length >= 9 && machine.Mid == machineCode || allowOverdraft && machine.Mid.length >= 19 && machine.Mid == machineCode) {
                    return true;
                }
            })
        } else {

            license.ActivatedMachines.forEach(machine => {
                if (machine.Mid == machineCode)
                    return true;
            });
        }
        return false;
    }
}