import errors from '@tryghost/errors';

function buildParams(params = []) {
    let theParams = [];

    params.forEach((param) => {
        if (param.required) {
            theParams.push(`<${param.name}>`);
        } else {
            theParams.push(`[${param.name}]`);
        }
    });

    return theParams.join(' ');
}

function buildParamDescriptions(params = []) {
    return params.map(param => param.desc);
}

function buildArguments(sywac, options = []) {
    return options.forEach((option) => {
        if (option.type === 'string') {
            sywac.string(option.flags, {
                defaultValue: null,
                desc: option.desc
            });
        } else if (option.type === 'number') {
            sywac.number(option.flags, {
                defaultValue: null,
                desc: option.desc
            });
        } else if (option.type === 'array') {
            sywac.array(option.flags, {
                defaultValue: option.defaultValue,
                choices: option.choices,
                desc: option.desc
            });
        } else if (option.type === 'enumeration') {
            sywac.enumeration(option.flags, {
                defaultValue: option.defaultValue,
                choices: option.choices,
                desc: option.desc
            });
        } else if (option.type === 'boolean') {
            sywac.array(option.flags, {
                defaultValue: option.defaultValue,
                desc: option.desc
            });
        } else {
            throw new errors.InternalServerError({message: `sywac type not implemented: ${option.type}`});
        }
    });
}

export {
    buildParams,
    buildParamDescriptions,
    buildArguments
};
