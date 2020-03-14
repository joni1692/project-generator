#!/usr/bin/env node

// imports
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const shell = require('shelljs');
const chalk = require('chalk');

const render = require('./utils/templates').render;

//
const TEMPLATE_OPTIONS = fs.readdirSync(path.join(__dirname, 'templates'));
const QUESTIONS = [
    {
        name: 'template',
        type: 'list',
        message: '¿que tipo de proyecto quieres generar?',
        choices: TEMPLATE_OPTIONS
    },
    {
        name: 'proyecto',
        type: 'input',
        message: '¿cual es el nombre del proyecto?',
        validate: function(input) {
            if(/^([a-z@]{1}[a-z\-\.\\\/0-9]{0,213})*$/.test(input)){
                return true;
            }

            return 'El nombre del proyecto solo puede tener 214 caracteres, tiene que empezar en minuscula o con @'
        }
    }
];

const DIR_ACTUAL = process.cwd();
inquirer.prompt(QUESTIONS).then(respuestas => {
    const template = respuestas['template'];
    const proyecto = respuestas['proyecto'];

    const templatePath = path.join(__dirname, 'templates', template);
    const pathTarget = path.join(DIR_ACTUAL, proyecto);
    if(!createProject(pathTarget)) return;

    createDirectoriesFilesContent(templatePath, proyecto);
    postProcess(templatePath, pathTarget);
});

function createProject(projectPath){
    if(fs.existsSync(projectPath)){
        console.log(chalk.red('no puedes crear el proyecto porque ya existe'));
        return false;
    }
    fs.mkdirSync(projectPath);
    return true;
}

function createDirectoriesFilesContent(templatePath, projectName){
    const listFileDirectories = fs.readdirSync(templatePath);

    listFileDirectories.forEach(item => {
        const originalPath = path.join(templatePath, item);

        const stats = fs.statSync(originalPath);

        const writePath = path.join(DIR_ACTUAL, projectName, item);

        if(stats.isFile()){
            let contents = fs.readFileSync(originalPath, 'utf-8');
            contents = render(contents, {projectName});

            fs.writeFileSync(writePath, contents, 'utf-8');

            //informacion adicional
            const create = chalk.green('CREATE ');
            const size = stats['size'];
            console.log(`${create} ${originalPath} (${size} bytes)`);
        }else if(stats.isDirectory()) {
            fs.mkdirSync(writePath);
            createDirectoriesFilesContent(path.join(templatePath, item), path.join(projectName, item))
        }
    });
}

function postProcess(templatePath, targetPath) {
    const isNode = fs.existsSync(path.join(templatePath, 'package.json'));

    if(isNode) {
        shell.cd(targetPath);
        console.log(chalk.green(`Instalando las dependencias ${targetPath}`));
        const result = shell.exec('npm install');
        if(result.code != 0) {
            return false;
        }
    }
}