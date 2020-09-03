const main = async () => {
    const response = await fetch('https://gist.githubusercontent.com/dddomin3/7cf6046edf1eaffab2ebb4c94f34ce09/raw/top.json');
    const topJson = await response.json(); //extract JSON from the http response
    console.log(topJson)
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

    console.log(config, dataFormat, dataInput, dataLine)
    let name, age, date, diagnosis, examinerName, examinerId, comments, itemCount, expectedScore, modelVariance, rawScore, outputSuccess, outputError, errorText, itemDifficultyModifier, examinerIdFound = false, debugMode = false, debugStepDifficulty;
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
                console.log(this.dataInput)
                console.log(e)
                console.log("Item Count is: " + this.itemCount)
                if (this.debugMode) {
                    this.config.stepDifficulty = this.config.stepDifficulty.map((stepDifficulty, i) => this.debugStepDifficulty[i].difficulty)
                }
                let itemDifficultyModifier = calculateItemDifficultyModifier(this.examinerId, this.config, this.examinerData)
                console.log(itemDifficultyModifier)
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
                    console.log(self.dataLine)
                })
            },
            parseDataLine: function (e) {
                let dataLineArray = this.dataLine.split(',')
                this.name = dataLineArray[0]
                this.examinerId = dataLineArray[1]
                dataLineArray = dataLineArray.slice(3) // Removing garbage characters
                let self = this
                this.dataInput.forEach(function (val, index) {
                    if (val.data.extent) {
                        let newValue = dataLineArray.shift()
                        if (newValue === "") {
                            self.dataInput[index].data.extent = 'ns'
                        }
                        else {
                            self.dataInput[index].data.extent = newValue
                        }
                    }
                })
                this.dataInput.forEach(function (val, index) {
                    if (val.data.intensity) {
                        let newValue = dataLineArray.shift()
                        if (newValue === "") {
                            self.dataInput[index].data.intensity = 'ns'
                        }
                        else {
                            self.dataInput[index].data.intensity = newValue
                        }
                    }
                })
                this.dataInput.forEach(function (val, index) {
                    if (val.data.skill) {
                        let newValue = dataLineArray.shift()
                        if (newValue === "") {
                            self.dataInput[index].data.skill = 'ns'
                        }
                        else {
                            self.dataInput[index].data.skill = newValue
                        }
                    }
                })
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
    return [subjectId, raterId, '1-28'].concat(extent, intensity, skill).join()
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
    console.log({ itemName, normalizer, expectation, sumSquare, currentLogit })
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
            }
            console.log('overshot')
        }
        outputMath = iterativeMath(dataInput, dataFormat, previousEstimate, itemDifficultyModifier, config)
        expectedScore = outputMath.expectedScore
        modelVariance = outputMath.modelVariance
        rawScore = outputMath.rawScore
        currentEstimate = previousEstimate + (rawScore - expectedScore) / modelVariance
        iterationCount++
        if (iterationCount > maxIterations) { break }
    }
    console.log({ iterationCount })
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
    console.log({ expectedScore, modelVariance, rawScore })
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