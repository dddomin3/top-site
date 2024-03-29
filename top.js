const main = async () => {
    const currentLocation = window.location
    const baseUrlProtocol = currentLocation.protocol + '//' + currentLocation.hostname
    const response = await fetch(baseUrlProtocol + '/top.json?hash=ly2ai8tgLiRHn4fHnG7RY4ukl'); //hash for cache busting
    const topJson = await response.json(); //extract JSON from the http response
    // console.log(topJson)
    // process incoming json into several config objects
    let config = topJson.config
    let examinerData = topJson.examinerData
    let dataFormat = topJson.items
    let dataInput = dataFormat.map(function (i) {
        inputObject = {}
        if (i.extent) {
            inputObject.extent = "ns"
        }
        if (i.intensity) {
            inputObject.intensity = "ns"
        }
        if (i.skill) {
            inputObject.skill = "ns"
        }
        return {
            displayName: i.displayName,
            data: Object.assign({}, inputObject),
            comments: ""
        };
    });
    let dataLine = makeDataLine(dataInput, '', '')
    let userCsvHeader = "Child,Rater,,Engaged (E),Decides (E),Safety (E),Process (E),Social Play (E),Engaged (I),Persist (I),Social Play (I),Affect (I),Interact'n with objects (I),Engaged (S),Modifies (S),Mischief/teasing (S),Pretends (S),Unconvent'l/variable (S),Negotiates (S),Social Play (S),Supports (S),Enters (S),Initiates (S),Clowns/jokes (S),Shares (S),Gives (S),Responds (S),Intract'n with objects (S),Transitions (S),Raw Score,Measure,Outfit Mean Square,Infit Mean Square,Link"
    let adminCsvHeader = "Child,Rater,,Engaged (E),Decides (E),Safety (E),Process (E),Social Play (E),Engaged (I),Persist (I),Social Play (I),Affect (I),Interact'n with objects (I),Engaged (S),Modifies (S),Mischief/teasing (S),Pretends (S),Unconvent'l/variable (S),Negotiates (S),Social Play (S),Supports (S),Enters (S),Initiates (S),Clowns/jokes (S),Shares (S),Gives (S),Responds (S),Intract'n with objects (S),Transitions (S),Raw Score,Model Variance,SEM,Measure,Outfit Mean Square,Infit Mean Square,Link,Examinee Name,Examinee Age,Examinee Diagnosis,Examiner Name,Examination Date,Examination Comments"
    let name = "", age = "", date = "", diagnosis = "", examinerName = "", examinerId = "", comments = "", csvData, itemCount, expectedScore, modelVariance, standardErrorOfMeasurement, rawScore, outfitMeanSquare = 0, infitMeanSquare = 0, outputSuccess, outputError, errorText, itemDifficultyModifier, examinerIdFound = false, debugStepDifficulty, csvDownloadActive = false, csvDownloadContent = "", csvDownloadFilename = "";

    // Populate data using URL
    if (location.hash) {
        dataLine = location.hash.substring(1)
        let output = parseDataLine(dataLine, dataInput)
        name = output.name
        examinerId = output.examinerId
        dataInput = output.dataInput
    }

    // console.log({config, dataFormat, dataInput, dataLine})
    debugStepDifficulty = config.stepDifficulty.map((stepDifficulty) => ({ difficulty: stepDifficulty }))
    outputSuccess = false;
    outputError = false;
    new Vue({
        el: '#app',
        data: {
            name,
            age,
            examinerName,
            examinerId,
            diagnosis,
            date,
            comments,
            dataFormat,
            dataInput,
            dataLine,
            config,
            examinerData,

            csvData,
            csvDownloadActive,
            csvDownloadContent,
            csvDownloadFilename,

            outputSuccess,
            outputError,

            itemCount,
            expectedScore,
            modelVariance,
            standardErrorOfMeasurement,
            rawScore,
            outfitMeanSquare,
            infitMeanSquare,
            itemDifficultyModifier,
            examinerIdFound,
            errorText,
            debugStepDifficulty
        },
        methods: {
            calculate: function (e) {
                this.itemCount = countItems(this.dataInput)
                // console.log(this.dataInput)
                // console.log(e)
                // console.log("Item Count is: " + this.itemCount)
                let itemDifficultyModifier = calculateItemDifficultyModifier(this.examinerId, this.config, this.examinerData)
                // console.log(itemDifficultyModifier)
                iterationOutput = iterate(this.dataInput, this.dataFormat, itemDifficultyModifier, this.config, this.itemCount)

                this.expectedScore = iterationOutput.currentEstimate
                this.modelVariance = iterationOutput.modelVariance
                this.standardErrorOfMeasurement = 1 / Math.sqrt(iterationOutput.modelVariance)
                this.rawScore = iterationOutput.rawScore
                this.infitMeanSquare = iterationOutput.infitMeanSquare
                this.outfitMeanSquare = iterationOutput.outfitMeanSquare
                this.outputSuccess = true
                this.itemDifficultyModifier = itemDifficultyModifier
                this.examinerIdFound = typeof this.examinerId === "undefined" ? false : this.examinerId in this.examinerData


                let adminCalculatedOutput = [adminCsvHeader]
                let calculatedOutput = [userCsvHeader]
                let itemLink = '"' + baseUrlProtocol + '/top.html#' + this.dataLine + '"'

                let outputLine = this.dataLine + ',' +
                    iterationOutput.rawScore + ',' +
                    iterationOutput.currentEstimate + ',' +
                    itemLink
                let adminOutputLine = this.dataLine + ',' +
                    iterationOutput.rawScore + ',' +
                    iterationOutput.modelVariance + ',' +
                    this.standardErrorOfMeasurement + ',' +
                    iterationOutput.currentEstimate + ',' +
                    itemLink + ',' +
                    this.name + ',' +
                    this.age + ',' +
                    this.diagnosis + ',' +
                    this.examinerName + ',' +
                    this.date + ',' +
                    this.comments
                adminCalculatedOutput.push(adminOutputLine)
                calculatedOutput.push(outputLine)

                var fileContent = encodeURIComponent(calculatedOutput.join('\n'))
                let userFileName = ''
                if (this.examinerName) {
                    userFileName = `${this.examinerName}`
                }
                else {
                    userFileName = `anonymous`
                }
                if (this.date) {
                    userFileName = `${userFileName}-${this.date}`
                }
                if (this.name) {
                    userFileName = `${userFileName}-${this.name}`
                }
                if (this.age) {
                    userFileName = `${userFileName}-${this.age}`
                }
                if (this.diagnosis) {
                    userFileName = `${userFileName}-${this.diagnosis}`
                }
                if (this.comments) {
                    userFileName = `${userFileName}-${this.comments}`
                }
                if (userFileName) {
                    userFileName = userFileName + '.csv'
                }
                else {
                    userFileName = (new Date()).toISOString() + '.csv'
                }

                let adminFileName = encodeURIComponent((new Date()).toISOString()) + '.log'
                let adminFileContent = adminCalculatedOutput.join('\n')

                this.csvDownloadActive = true
                this.csvDownloadFilename = userFileName
                this.csvDownloadContent = 'data:text/csv;charset=utf-8,' + fileContent

                fetch(`${baseUrlProtocol}/topLogs/${adminFileName}`, {
                    method: 'PUT',
                    headers: {
                        'x-amz-acl': 'bucket-owner-full-control'
                    },
                    body: adminFileContent
                })
                    .then(response => response)
                    .then(result => {
                        console.log('Success:', result);
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
            },
            routeUpdate: function (e) {
                let self = this
                Vue.nextTick(function () {
                    self.dataLine = makeDataLine(self.dataInput, self.name, self.examinerId)
                    window.history.replaceState(null, '', 'top.html#' + self.dataLine)
                    // console.log(self.dataLine)
                })
            },
            parseDataLine: function (e) {
                let { name, examinerId, dataInput } = parseDataLine(this.dataLine, this.dataInput)
                this.name = name
                this.examinerId = examinerId
                // this.dataInput = dataInput // This might break stuff...
            },
            csvHidePanel: function () {
                this.csvDownloadActive = false
            },
            csvUploaded: function (e) {
                let fileList = e.target.files
                // console.log(this.csvData)
                // console.log(e)
                // console.log(fileList)
                let self = this
                let fileReader = new FileReader()
                if (!fileList.length) return;
                let fileName = ""
                fileReader.onload = function (e) {
                    console.log(e)
                    let fileContents = e.target.result
                    self.csvData = fileContents
                    let perLine = fileContents.split('\n')
                    let calculatedOutput = [userCsvHeader]
                    let adminCalculatedOutput = [adminCsvHeader]

                    const regex = RegExp('[^a-zA-Z0-9\\s-,]')
                    let ignoredInputs = []
                    perLine.forEach(dataLine => {
                        dataLine = dataLine.trim() // Removes any whitespace characters that crept their way in
                        // TODO: Can do some string treatment here to correct common mistakes or something...
                        let skip = regex.test(dataLine)
                        // console.log({dataLine, skip})
                        if (skip) { ignoredInputs.push(dataLine); return; }
                        let csvDataInput = self.dataFormat.map(function (i) {
                            inputObject = {}
                            if (i.extent) {
                                inputObject.extent = "ns"
                            }
                            if (i.intensity) {
                                inputObject.intensity = "ns"
                            }
                            if (i.skill) {
                                inputObject.skill = "ns"
                            }
                            return {
                                displayName: i.displayName,
                                data: Object.assign({}, inputObject),
                                comments: ""
                            };
                        });
                        let name = ""
                        let examinerId = 0
                        let parsedOutput = parseDataLine(dataLine, csvDataInput)
                        name = parsedOutput.name
                        examinerId = parsedOutput.examinerId
                        csvDataInput = parsedOutput.dataInput
                        // console.log({name, examinerId, csvDataInput})
                        let itemDifficultyModifier = calculateItemDifficultyModifier(examinerId, self.config, self.examinerData)
                        let itemCount = countItems(csvDataInput)
                        let iterationOutput = iterate(csvDataInput, self.dataFormat, itemDifficultyModifier, self.config, itemCount)
                        let itemLink = '"' + baseUrlProtocol + '/top.html#' + dataLine + '"'
                        let outputLine = makeDataLine(dataInput, name, examinerId) + ',' +
                            iterationOutput.rawScore + ',' +
                            iterationOutput.currentEstimate + ',' +
                            iterationOutput.outfitMeanSquare + ',' +
                            iterationOutput.infitMeanSquare + ',' +
                            itemLink

                        let adminOutputLine = makeDataLine(dataInput, name, examinerId) + ',' +
                            iterationOutput.rawScore + ',' +
                            iterationOutput.modelVariance + ',' +
                            this.standardErrorOfMeasurement + ',' +
                            iterationOutput.currentEstimate + ',' +
                            iterationOutput.outfitMeanSquare + ',' +
                            iterationOutput.infitMeanSquare + ',' +
                            itemLink + ',' +
                            self.name + ',' +
                            self.age + ',' +
                            self.diagnosis + ',' +
                            self.examinerName + ',' +
                            self.date + ',' +
                            self.comments

                        calculatedOutput.push(outputLine)
                        adminCalculatedOutput.push(adminOutputLine)
                        // console.log({iterationOutput})
                    })
                    // console.log({calculatedOutput})
                    // Provide file for download
                    var element = document.createElement('a');
                    var fileContent = encodeURIComponent(
                        calculatedOutput.join('\n') + '\n\n\n' +
                        "The following inputs were ignored due to improper formatting:,Note: the title of your data may appear here, and that's expected\n\n" +
                        ignoredInputs.join('\n')
                    )
                    self.csvDownloadActive = true
                    self.csvDownloadFilename = filename + "-processed.csv"
                    self.csvDownloadContent = 'data:text/csv;charset=utf-8,' + fileContent

                    let adminFileName = encodeURIComponent((new Date()).toISOString()) + '.log'
                    let adminFileContent = adminCalculatedOutput.join('\n')

                    fetch(`${baseUrlProtocol}/topLogs/${adminFileName}`, {
                        method: 'PUT',
                        headers: {
                            'x-amz-acl': 'bucket-owner-full-control'
                        },
                        body: adminFileContent
                    })
                        .then(response => response)
                        .then(result => {
                            console.log('Success:', result);
                        })
                        .catch(error => {
                            console.error('Error:', error);
                        });

                    element.setAttribute('href', self.csvDownloadContent);
                    element.setAttribute('download', self.csvDownloadFilename);
                    element.style.display = 'none';

                    document.body.appendChild(element);

                    element.click();

                    document.body.removeChild(element);
                }
                filename = fileList[0].name.split('.')[0]
                fileReader.readAsText(fileList[0]) // TODO: Allow multiple csv uploads?
            }
        }
    });
}
main()

function makeDataLine(dataInput, subjectId, raterId) {
    let extent = []
    let intensity = []
    let skill = []
    dataInput.forEach(function (val, index) {
        if (val.data.extent) {
            if (val.data.extent === 'ns') {
                extent.push(null)
            }
            else {
                extent.push(val.data.extent)
            }
        }
        if (val.data.intensity) {
            if (val.data.intensity === 'ns') {
                intensity.push(null)
            }
            else {
                intensity.push(val.data.intensity)
            }
        }
        if (val.data.skill) {
            if (val.data.skill === 'ns') {
                skill.push(null)
            }
            else {
                skill.push(val.data.skill)
            }
        }
    })
    let dataLineArray = [subjectId, raterId, '1-26'].concat(extent, intensity, skill)
    return dataLineArray.join()
}

function parseDataLine(dataLine, dataInput) {
    let dataLineArray = dataLine.split(',')
    let name = dataLineArray[0]
    let examinerId = dataLineArray[1]
    dataLineArray = dataLineArray.slice(3) // Removing garbage characters
    dataInput.forEach(function (val, index) {
        if (val.data.extent) {
            let newValue = dataLineArray.shift()
            if (newValue === "") {
                dataInput[index].data.extent = 'ns'
            }
            else {
                dataInput[index].data.extent = newValue
            }
        }
    })
    dataInput.forEach(function (val, index) {
        if (val.data.intensity) {
            let newValue = dataLineArray.shift()
            if (newValue === "") {
                dataInput[index].data.intensity = 'ns'
            }
            else {
                dataInput[index].data.intensity = newValue
            }
        }
    })
    dataInput.forEach(function (val, index) {
        if (val.data.skill) {
            let newValue = dataLineArray.shift()
            if (newValue === "") {
                dataInput[index].data.skill = 'ns'
            }
            else {
                dataInput[index].data.skill = newValue
            }
        }
    })
    const regex2 = RegExp('[\\s,]*') // checking to see if remaining data (if any) is just blank
    let good = regex2.test(dataLineArray.join())
    if (!good) { console.log("Found a skip here", dataLine, dataLineArray.join()) }
    return { name, examinerId, dataInput }
}

function countItems(dataInput) {
    return dataInput.map(function (input) {
        count = Object.values(input.data)
            .reduce((prev, curr) => curr === "ns" ? prev : prev + 1, 0)
        return count
    }).reduce((prev, curr) => prev + curr, 0)
}

function perItemMath(itemDifficulty, abilityEstimate, inputData, config) {
    let logit = abilityEstimate - itemDifficulty

    let normalizer = 0
    let expectation = 0
    let sumSquare = 0
    let currentLogit = 0
    let residual = 0
    let variance = 0
    let standardizedResidual = 0
    let remark = ""
    let itemOutfitMeanSquareNumerator = 0
    let itemInfitMeanSquareNumerator = 0
    let itemInfitMeanSquareDivisor = 0

    config.stepDifficulty.forEach(function (currentStepDifficulty, i) {
        currentLogit = currentLogit + logit - currentStepDifficulty
        value = Math.exp(currentLogit)
        normalizer = normalizer + value
        expectation = expectation + i * value
        sumSquare = sumSquare + i * i * value
    })
    expectation = expectation / normalizer
    variance = (sumSquare / normalizer) - (expectation * expectation)
    residual = inputData - expectation
    standardizedResidual = residual / Math.sqrt(variance)
    if (standardizedResidual > 2) {
        remark = "Unexpectedly high rating"
    }
    else if (standardizedResidual < 2) {
        remark = "Unexpectedly low rating"
    }

    itemOutfitMeanSquareNumerator = standardizedResidual * standardizedResidual
    itemInfitMeanSquareNumerator = residual * residual
    itemInfitMeanSquareDivisor = variance

    return { expectation, variance, itemOutfitMeanSquareNumerator, itemInfitMeanSquareNumerator, itemInfitMeanSquareDivisor, remark }
}
function calculateItemDifficultyModifier(examinerId, config, examinerData) {
    let modifier = 0
    if ((typeof examinerId !== 'undefined') && (examinerData[examinerId])) {
        modifier += examinerData[examinerId].measure
    }
    else {
        modifier += examinerData.default.measure
    }
    return modifier
}
function iterate(dataInput, dataFormat, itemDifficultyModifier, config, itemCount) {
    let previousEstimate = 0 // initial estimate
    let previousPreviousEstimate = 0 // for overshooting

    let outputMath = iterativeMath(dataInput, dataFormat, config.initialAbilityEstimate, itemDifficultyModifier, config)
    let expectedScore = outputMath.expectedScore
    let modelVariance = outputMath.modelVariance
    let rawScore = outputMath.rawScore
    let outfitMeanSquareNumerator = outputMath.outfitMeanSquareNumerator
    let infitMeanSquareNumerator = outputMath.infitMeanSquareNumerator
    let infitMeanSquareDivisor = outputMath.infitMeanSquareDivisor
    let currentEstimate = previousEstimate + (rawScore - expectedScore) / modelVariance

    let maxIterations = 1000
    let iterationCount = 0

    while (Math.abs(currentEstimate - previousEstimate) >= .01) { // Loop back to step 5) until the change in ability is too small (.01) to matter
        overshot = theEstimatesOvershoot(previousPreviousEstimate, previousEstimate, currentEstimate)
        previousPreviousEstimate = previousEstimate
        previousEstimate = currentEstimate
        if (overshot) {
            // If the estimates overshoot, then multiply the divider by 2,
            modelVariance = modelVariance * 2
            if (modelVariance < 1) {
                // ...and set its minimum value at 1.0:  Variance divider = max(Variance*2, 1.0)
                modelVariance = 1
            }
            // console.log('overshot')
        }
        else {
            modelVariance = outputMath.modelVariance
        }
        outputMath = iterativeMath(dataInput, dataFormat, previousEstimate, itemDifficultyModifier, config)
        expectedScore = outputMath.expectedScore
        rawScore = outputMath.rawScore

        outfitMeanSquareNumerator = outputMath.outfitMeanSquareNumerator
        infitMeanSquareNumerator = outputMath.infitMeanSquareNumerator
        infitMeanSquareDivisor = outputMath.infitMeanSquareDivisor

        currentEstimate = previousEstimate + (rawScore - expectedScore) / modelVariance

        iterationCount++
        if (iterationCount > maxIterations) { break }
    }
    let outfitMeanSquare = outfitMeanSquareNumerator / itemCount
    let infitMeanSquare = infitMeanSquareNumerator / infitMeanSquareDivisor
    outfitMeanSquare = outfitMeanSquare > 9.9 ? 9.9 : outfitMeanSquare
    // console.log({ iterationCount })
    return { currentEstimate, modelVariance, rawScore, outfitMeanSquare, infitMeanSquare }
}

function iterativeMath(dataInput, dataFormat, abilityEstimate, itemDifficultyModifier, config) {
    let stepDifficulty = config.stepDifficulty
    let rawScore = 0
    let expectedScore = 0
    let modelVariance = 0
    let outfitMeanSquareNumerator = 0
    let infitMeanSquareNumerator = 0
    let infitMeanSquareDivisor = 0

    dataInput.map(function (input, i) {
        dataFormatEntry = dataFormat[i]
        if (input.data.extent && input.data.extent !== "ns") {
            rawScore = rawScore + Number(input.data.extent)
            itemDifficulty = dataFormatEntry.extentDetail.itemDifficulty + itemDifficultyModifier
            perItemResults = perItemMath(itemDifficulty, abilityEstimate, Number(input.data.extent), config)
            expectedScore = expectedScore + perItemResults.expectation
            modelVariance = modelVariance + perItemResults.variance
            outfitMeanSquareNumerator = outfitMeanSquareNumerator + perItemResults.itemOutfitMeanSquareNumerator
            infitMeanSquareNumerator = infitMeanSquareNumerator + perItemResults.itemInfitMeanSquareNumerator
            infitMeanSquareDivisor = infitMeanSquareDivisor + perItemResults.itemInfitMeanSquareDivisor
        }
        if (input.data.intensity && input.data.intensity !== "ns") {
            rawScore = rawScore + Number(input.data.intensity)
            itemDifficulty = dataFormatEntry.intensityDetail.itemDifficulty + itemDifficultyModifier
            perItemResults = perItemMath(itemDifficulty, abilityEstimate, Number(input.data.intensity), config)
            expectedScore = expectedScore + perItemResults.expectation
            modelVariance = modelVariance + perItemResults.variance
            outfitMeanSquareNumerator = outfitMeanSquareNumerator + perItemResults.itemOutfitMeanSquareNumerator
            infitMeanSquareNumerator = infitMeanSquareNumerator + perItemResults.itemInfitMeanSquareNumerator
            infitMeanSquareDivisor = infitMeanSquareDivisor + perItemResults.itemInfitMeanSquareDivisor
        }
        if (input.data.skill && input.data.skill !== "ns") {
            rawScore = rawScore + Number(input.data.skill)
            itemDifficulty = dataFormatEntry.skillDetail.itemDifficulty + itemDifficultyModifier
            perItemResults = perItemMath(itemDifficulty, abilityEstimate, Number(input.data.skill), config)
            expectedScore = expectedScore + perItemResults.expectation
            modelVariance = modelVariance + perItemResults.variance
            outfitMeanSquareNumerator = outfitMeanSquareNumerator + perItemResults.itemOutfitMeanSquareNumerator
            infitMeanSquareNumerator = infitMeanSquareNumerator + perItemResults.itemInfitMeanSquareNumerator
            infitMeanSquareDivisor = infitMeanSquareDivisor + perItemResults.itemInfitMeanSquareDivisor
        }
    })
    modelVariance = modelVariance < 0.00001 ? 0.00001 : modelVariance
    // console.log({ expectedScore, modelVariance, rawScore })
    return { expectedScore, modelVariance, rawScore, outfitMeanSquareNumerator, infitMeanSquareNumerator, infitMeanSquareDivisor }
}

function theEstimatesOvershoot(prevprev, prev, curr) {
    /*
        Yes, "overshoot". Suppose the final value will be 1.5, and the current value is M = 1.0. 
        If the change (Raw Score - Expected Score)/Variance = 0.75 then M' = 1.0 + 0.75 = 1.75. We have overshot 1.5, but we don't know it yet, because we don't know what the final value will be. 

        So how do we know that we have overshot? We discover this on the next change. Now M = 1.75 and (Raw Score - Expected Score)/Variance = -0.50, so that M' = 1.75 - 0.50 = 1.25. The sequence of estimates is:
        1.0, 1.75, 1.25. We are jumping up and down. This tells us we are overshooting.
        Now we divide the change by 2 from here onwards. Let's pretend we did that originally, then the sequence of estimates would have been something like:
        1.0, 1.0 + .75/2 = 1.375, 1.375 + 0.20/2 = 1.475, etc. ...



        What's the problem with overshooting? Sometimes the estimates get worse like this: 1.0, 1.75, 0.5, 2.75, ...



        If you don't want to track the changing estimates, then divide by 2 all along, and set the maximum change at ±1.0 logits.
    */
    if ((prevprev < prev) && (curr < prev)) {
        return true
    }
    return false
}