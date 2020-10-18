const main = async () => {
    const response = await fetch('https://gist.githubusercontent.com/dddomin3/7cf6046edf1eaffab2ebb4c94f34ce09/raw/top.json');
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

    let name, age, date, diagnosis, examinerName, examinerId, comments, csvData, itemCount, expectedScore, modelVariance, rawScore, outputSuccess, outputError, errorText, itemDifficultyModifier, examinerIdFound = false, debugMode = false, debugStepDifficulty;

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

            outputSuccess,
            outputError,

            itemCount,
            expectedScore,
            modelVariance,
            rawScore,
            itemDifficultyModifier,
            examinerIdFound,
            errorText,
            debugMode,
            debugStepDifficulty
        },
        methods: {
            calculate: function (e) {
                this.itemCount = countItems(this.dataInput)
                // console.log(this.dataInput)
                // console.log(e)
                // console.log("Item Count is: " + this.itemCount)
                if (this.debugMode) {
                    this.config.stepDifficulty = this.config.stepDifficulty.map((stepDifficulty, i) => this.debugStepDifficulty[i].difficulty)
                }
                let itemDifficultyModifier = calculateItemDifficultyModifier(this.examinerId, this.config, this.examinerData)
                // console.log(itemDifficultyModifier)
                iterationOutput = iterate(this.dataInput, this.dataFormat, itemDifficultyModifier, this.config)

                this.expectedScore = iterationOutput.currentEstimate
                this.modelVariance = iterationOutput.modelVariance
                this.rawScore = iterationOutput.rawScore
                this.outputSuccess = true
                this.itemDifficultyModifier = itemDifficultyModifier
                this.examinerIdFound = typeof this.examinerId === "undefined" ? false : this.examinerId in this.examinerData
            },
            debugModeActivate: function (e) {
                this.debugMode = true
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
                let {name, examinerId, dataInput} = parseDataLine(this.dataLine, this.dataInput)
                this.name = name
                this.examinerId = examinerId
                // this.dataInput = dataInput // This might break stuff...
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
                    let calculatedOutput = ["Child,Rater,,Engaged (E),Decides (E),Safety (E),Mischief/teasing (E),Process (E),Social Play (E),Clowns/jokes (E),Engaged (I),Persist (I),Social Play (I),Affect (I),Interact'n with objects (I),Engaged (S),Modifies (S),Mischief/teasing (S),Pretends (S),Unconvent'l/variable (S),Negotiates (S),Social Play (S),Supports (S),Enters (S),Initiates (S),Clowns/jokes (S),Shares (S),Gives (S),Responds (S),Intract'n with objects (S),Transitions (S),Raw Score,Expected Score,Model Variance,Link"]
                    const regex = RegExp('[^0-9\\s-,]')
                    let ignoredInputs = []
                    perLine.forEach(dataLine => {
                        dataLine = dataLine.trim() // Removes any whitespace characters that crept their way in
                        // TODO: Can do some string treatment here to correct common mistakes or something...
                        let skip = regex.test(dataLine)
                        // console.log({dataLine, skip})
                        if (skip) { ignoredInputs.push(dataLine); return;}
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
                        let iterationOutput = iterate(csvDataInput, self.dataFormat, itemDifficultyModifier, self.config)
                        let itemLink = '"https://www.testofplayfulness.com/top.html#' + dataLine + '"'
                        let outputLine = dataLine + ',' +
                            iterationOutput.rawScore + ',' + 
                            iterationOutput.currentEstimate + ',' +
                            iterationOutput.modelVariance + ',' +
                            itemLink

                        calculatedOutput.push(outputLine)
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
                    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + fileContent);
                    element.setAttribute('download', filename + "-processed.csv");
                    
                    element.style.display = 'none';
                    document.body.appendChild(element);
                    
                    element.click();
                    
                    document.body.removeChild(element);
                    // TODO: Literally, i think i can parseDataLine -> iterate, and 
                    // TODO: append the output at the end of the CSV after creating a title line.
                    // TODO: I should make sure to strip any lines that are garbage, and
                    // TODO: throw them at the end or something, with a general error at the last column
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
    let dataLineArray = [subjectId, raterId, '1-28'].concat(extent, intensity, skill)
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
    return {name, examinerId, dataInput}
}

function countItems(dataInput) {
    return dataInput.map(function (input) {
        count = Object.values(input.data)
            .reduce((prev, curr) => curr === "ns" ? prev : prev + 1, 0)
        return count
    }).reduce((prev, curr) => prev + curr, 0)
}

function perItemMath(itemDifficulty, abilityEstimate, itemName, config) {
    let logit = abilityEstimate - itemDifficulty

    let normalizer = 0
    let expectation = 0
    let sumSquare = 0
    let currentLogit = 0

    config.stepDifficulty.forEach(function (currentStepDifficulty, i) {
        currentLogit = currentLogit + logit - currentStepDifficulty
        value = Math.exp(currentLogit)
        normalizer = normalizer + value
        expectation = expectation + i * value
        sumSquare = sumSquare + i * i * value
    })
    // console.log({ itemName, normalizer, expectation, sumSquare, currentLogit })
    expectation = expectation / normalizer
    variance = sumSquare / normalizer - expectation * expectation
    return { expectation, variance }
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
function iterate(dataInput, dataFormat, itemDifficultyModifier, config) {
    let previousEstimate = 0 // initial estimate
    let previousPreviousEstimate = 0 // for overshooting

    let outputMath = iterativeMath(dataInput, dataFormat, config.initialAbilityEstimate, itemDifficultyModifier, config)
    let expectedScore = outputMath.expectedScore
    let modelVariance = outputMath.modelVariance
    let rawScore = outputMath.rawScore
    let currentEstimate = previousEstimate + (rawScore - expectedScore) / modelVariance

    let maxIterations = 1000
    let iterationCount = 0
    while (currentEstimate - previousEstimate >= .01) {
        overshot = theEstimatesOvershoot(previousPreviousEstimate, previousEstimate, currentEstimate)
        previousPreviousEstimate = previousEstimate
        previousEstimate = currentEstimate
        if (overshot) {
            // If the estimates overshoot, then multiply the divider by 2,
            modelVariance = modelVariance * 2
            if (modelVariance < 1) {
                // ...and set its minimum value at 1.0:  Variance divider = max(Variance*2, 1.0)
                modelVariance = 1
                outputMath.modelVariance = 1
            }
            // console.log('overshot')
        }
        else {
            modelVariance = outputMath.modelVariance
        }
        outputMath = iterativeMath(dataInput, dataFormat, previousEstimate, itemDifficultyModifier, config)
        expectedScore = outputMath.expectedScore
        rawScore = outputMath.rawScore
        currentEstimate = previousEstimate + (rawScore - expectedScore) / modelVariance
        iterationCount++
        if (iterationCount > maxIterations) { break }
    }
    // console.log({ iterationCount })
    return { currentEstimate, modelVariance, rawScore }
}

function iterativeMath(dataInput, dataFormat, abilityEstimate, itemDifficultyModifier, config) {
    let stepDifficulty = config.stepDifficulty
    let rawScore = 0
    let expectedScore = 0
    let modelVariance = 0

    dataInput.map(function (input, i) {
        dataFormatEntry = dataFormat[i]
        if (input.data.extent && input.data.extent !== "ns") {
            rawScore = rawScore + Number(input.data.extent)
            itemDifficulty = dataFormatEntry.extentDetail.itemDifficulty + itemDifficultyModifier
            perItemResults = perItemMath(itemDifficulty, abilityEstimate, input.displayName + " extent", config)
            expectedScore = expectedScore + perItemResults.expectation
            modelVariance = modelVariance + perItemResults.variance
        }
        if (input.data.intensity && input.data.intensity !== "ns") {
            rawScore = rawScore + Number(input.data.intensity)
            itemDifficulty = dataFormatEntry.intensityDetail.itemDifficulty + itemDifficultyModifier
            perItemResults = perItemMath(itemDifficulty, abilityEstimate, input.displayName + " intensity", config)
            expectedScore = expectedScore + perItemResults.expectation
            modelVariance = modelVariance + perItemResults.variance
        }
        if (input.data.skill && input.data.skill !== "ns") {
            rawScore = rawScore + Number(input.data.skill)
            itemDifficulty = dataFormatEntry.skillDetail.itemDifficulty + itemDifficultyModifier
            perItemResults = perItemMath(itemDifficulty, abilityEstimate, input.displayName + " skill", config)
            expectedScore = expectedScore + perItemResults.expectation
            modelVariance = modelVariance + perItemResults.variance
        }
    })
    // console.log({ expectedScore, modelVariance, rawScore })
    return { expectedScore, modelVariance, rawScore }
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